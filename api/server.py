"""
MockMint API Server
FastAPI backend that generates specimen-quality GCSE exam PDFs
using question images extracted from source PDFs.
"""
import json
import re
import os
import random
import tempfile
from io import BytesIO
from typing import Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from PIL import Image as PILImage

# ============================================================
# CONFIG
# ============================================================

SOURCES_DIR = os.path.expanduser("~/Projects/gcse-exam-generator/sources")
QUESTIONS_PATH = os.path.expanduser(
    "~/Projects/gcse-exam-generator/question-bank/questions.json"
)

# ============================================================
# APP
# ============================================================

app = FastAPI(title="MockMint API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    tier: str = "higher"
    calculator: bool = True
    topics: list[str] = []
    targetMarks: int = 80
    excludedTopics: list[str] = []
    seed: Optional[int] = None
    title: Optional[str] = None


# ============================================================
# QUESTION LOADING & SELECTION
# ============================================================

_questions_cache: list[dict] | None = None


def load_questions() -> list[dict]:
    global _questions_cache
    if _questions_cache is None:
        with open(QUESTIONS_PATH, "r") as f:
            _questions_cache = json.load(f)
    return _questions_cache


def get_source_pdf_path(question: dict) -> str:
    board = question["board"]
    tier = question["tier"]
    paper = question["paper"]
    year = question["year"]
    session = question["session"]

    calc = "calculator" if question.get("calculator", False) else "non-calculator"
    tier_letter = "h" if tier == "higher" else "f"

    if session in ("specimen-1", "specimen-2", "sample"):
        filename = f"{board}-{session}-paper{paper}{tier_letter}-qp.pdf"
    else:
        filename = f"{board}-{session}-{year}-paper{paper}{tier_letter}-qp.pdf"

    return os.path.join(SOURCES_DIR, board, tier, calc, filename)


def validate_extraction(question: dict) -> bool:
    pdf_path = get_source_pdf_path(question)
    if not os.path.exists(pdf_path):
        return False
    region = find_question_region(pdf_path, question["question_number"])
    if not region:
        return False
    span = region["end_page"] - region["start_page"] + 1
    marks = question.get("marks", 0)
    if span > 3:
        return False
    if span > 2 and marks <= 3:
        return False
    return True


def select_questions(
    questions: list[dict],
    tier: str,
    calculator: bool,
    topics: list[str],
    target_marks: int,
    excluded_topics: list[str],
    seed: int | None = None,
) -> list[dict]:
    if seed is not None:
        random.seed(seed)
    else:
        random.seed()

    excluded_set = set(excluded_topics)

    eligible = [
        q
        for q in questions
        if q.get("tier") == tier
        and (not topics or q.get("topic") in topics)
        and q.get("topic") not in excluded_set
    ]

    # If calculator preference specified, filter (but allow both if topics span both)
    if topics:
        # When specific topics requested, filter by calculator
        eligible = [q for q in eligible if q.get("calculator") == calculator]
    else:
        eligible = [q for q in eligible if q.get("calculator") == calculator]

    # Pre-validate extraction
    valid = [q for q in eligible if validate_extraction(q)]
    eligible = valid

    if not eligible:
        return []

    # Group by topic category
    by_category: dict[str, list[dict]] = {}
    for q in eligible:
        cat = q.get("topic_category", "unknown")
        by_category.setdefault(cat, []).append(q)

    target_weights = {
        "number": 0.15,
        "algebra": 0.30,
        "ratio": 0.15,
        "geometry": 0.20,
        "probability": 0.10,
        "statistics": 0.10,
    }

    selected: list[dict] = []
    total_marks = 0
    used_sources: set[str] = set()
    used_topics: dict[str, int] = {}
    used_ids: set[str] = set()

    # Phase 1: one from each available category
    for cat in target_weights:
        if cat in by_category and by_category[cat]:
            pool = [
                q
                for q in by_category[cat]
                if 2 <= q["marks"] <= 6
            ]
            if pool:
                q = random.choice(pool)
                selected.append(q)
                total_marks += q["marks"]
                used_sources.add(q["source"])
                used_ids.add(q["id"])
                used_topics[q["topic"]] = used_topics.get(q["topic"], 0) + 1

    # Phase 2: fill to target
    max_attempts = 500
    attempts = 0
    while total_marks < target_marks and attempts < max_attempts:
        attempts += 1

        cat_scores: dict[str, float] = {}
        for cat, target_w in target_weights.items():
            if cat not in by_category or not by_category[cat]:
                continue
            current_marks = sum(
                q["marks"] for q in selected if q.get("topic_category") == cat
            )
            current_w = current_marks / max(total_marks, 1)
            cat_scores[cat] = max(0, target_w - current_w) + 0.01

        if not cat_scores:
            break

        cats = list(cat_scores.keys())
        weights = [cat_scores[c] for c in cats]
        total_w = sum(weights)
        weights = [w / total_w for w in weights]

        cat = random.choices(cats, weights=weights, k=1)[0]

        marks_remaining = target_marks - total_marks
        pool = [
            q
            for q in by_category[cat]
            if q["id"] not in used_ids
            and q["marks"] <= min(marks_remaining, 8)
            and q["marks"] >= 1
        ]

        source_counts: dict[str, int] = {}
        for s in selected:
            source_counts[s["source"]] = source_counts.get(s["source"], 0) + 1

        uncovered = [q for q in pool if q["topic"] not in used_topics]
        if uncovered and len(selected) < 15:
            pool = uncovered

        pool = [q for q in pool if source_counts.get(q["source"], 0) < 2]

        if not pool:
            pool = [
                q
                for q in by_category[cat]
                if q["id"] not in used_ids
                and q["marks"] <= min(marks_remaining, 8)
            ]

        if not pool:
            continue

        q = random.choice(pool)
        selected.append(q)
        total_marks += q["marks"]
        used_sources.add(q["source"])
        used_ids.add(q["id"])
        used_topics[q["topic"]] = used_topics.get(q["topic"], 0) + 1

    selected.sort(key=lambda q: q["marks"])
    return selected


# ============================================================
# QUESTION IMAGE EXTRACTOR
# ============================================================

_page_map_cache: dict[str, dict] = {}


def build_page_map(pdf_path: str) -> dict:
    if not os.path.exists(pdf_path):
        return {}

    doc = fitz.open(pdf_path)

    total_markers: dict[int, tuple[int, float]] = {}
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    line_text += span.get("text", "")
                line_text = line_text.strip()
                match = re.search(
                    r"Total for Question (\d+) is (\d+) mark", line_text
                )
                if match:
                    q_num = int(match.group(1))
                    total_markers[q_num] = (page_idx, line["bbox"][3] + 5)

    question_starts: dict[int, tuple[int, float]] = {}
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text_dict = page.get_text("dict")
        page_width = page.rect.width
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                first_span = spans[0]
                text = first_span.get("text", "").strip()
                bbox = line["bbox"]
                if bbox[0] > page_width * 0.18:
                    continue
                num_match = re.match(r"^(\d{1,2})$", text)
                if not num_match:
                    num_match = re.match(r"^(\d{1,2})\s*$", text)
                if not num_match:
                    num_match = re.match(r"^(\d{1,2})\s+[A-Z]", text)
                if not num_match and len(spans) > 1:
                    combined = text
                    for s in spans[1:]:
                        combined += s.get("text", "")
                    num_match = re.match(r"^(\d{1,2})\s", combined.strip())
                if num_match:
                    q_num = int(num_match.group(1))
                    if q_num not in total_markers:
                        continue
                    total_page, total_y = total_markers[q_num]
                    if page_idx > total_page:
                        continue
                    if page_idx == total_page and bbox[1] >= total_y:
                        continue
                    if q_num not in question_starts:
                        question_starts[q_num] = (page_idx, max(0, bbox[1] - 15))

    doc.close()

    regions = {}
    for q_num in total_markers:
        if q_num in question_starts:
            start_page, start_y = question_starts[q_num]
            end_page, end_y = total_markers[q_num]
            regions[q_num] = {
                "start_page": start_page,
                "start_y": start_y,
                "end_page": end_page,
                "end_y": end_y,
            }
    return regions


def find_question_region(pdf_path: str, question_number: int) -> dict | None:
    if pdf_path not in _page_map_cache:
        _page_map_cache[pdf_path] = build_page_map(pdf_path)
    regions = _page_map_cache[pdf_path]
    return regions.get(question_number)


def overlay_question_number(pdf_path: str, region: dict, new_q_num: int):
    if not os.path.exists(pdf_path):
        return None

    doc = fitz.open(pdf_path)
    original_q_num = None

    start_page = region["start_page"]
    start_y = region["start_y"]

    pages_to_check = [start_page]
    page0 = doc[start_page]
    if start_y > page0.rect.height - 80:
        if start_page + 1 < len(doc):
            pages_to_check.append(start_page + 1)

    for check_page_idx in pages_to_check:
        if original_q_num is not None:
            break
        page = doc[check_page_idx]
        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                first_span = spans[0]
                first_text = first_span.get("text", "").strip()
                span_bbox = first_span.get("bbox", line["bbox"])
                line_bbox = line["bbox"]
                if line_bbox[0] < page.rect.width * 0.18:
                    num_match = re.match(r"^(\d{1,2})$", first_text)
                    if num_match:
                        found_num = int(num_match.group(1))
                        if (
                            check_page_idx == start_page
                            and line_bbox[1] < start_y - 30
                        ):
                            continue
                        original_q_num = found_num
                        cover_rect = fitz.Rect(
                            span_bbox[0] - 3,
                            span_bbox[1] - 3,
                            span_bbox[2] + 5,
                            span_bbox[3] + 3,
                        )
                        page.draw_rect(cover_rect, color=None, fill=(1, 1, 1))
                        font_size = first_span.get("size", 11)
                        page.insert_text(
                            (span_bbox[0], span_bbox[3] - 1),
                            str(new_q_num),
                            fontsize=font_size,
                            fontname="helv",
                            color=(0, 0, 0),
                        )
                        break
            if original_q_num is not None:
                break

    # Update "Total for Question X" on end page
    total_found = False
    for check_page_idx in range(
        max(0, region["end_page"] - 1), min(len(doc), region["end_page"] + 2)
    ):
        if total_found:
            break
        check_page = doc[check_page_idx]
        text_dict = check_page.get_text("dict")
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    line_text += span.get("text", "")
                total_match = re.search(
                    r"Total for Question (\d+) is (\d+) marks?", line_text
                )
                if total_match:
                    found_q = int(total_match.group(1))
                    if original_q_num and found_q != original_q_num:
                        continue
                    bbox = line["bbox"]
                    cover_rect = fitz.Rect(
                        bbox[0] - 3, bbox[1] - 3, bbox[2] + 5, bbox[3] + 3
                    )
                    check_page.draw_rect(cover_rect, color=None, fill=(1, 1, 1))
                    marks_num = total_match.group(2)
                    mark_word = "mark" if marks_num == "1" else "marks"
                    new_text = f"(Total for Question {new_q_num} is {marks_num} {mark_word})"
                    font_size = (
                        line["spans"][0].get("size", 9) if line["spans"] else 9
                    )
                    check_page.insert_text(
                        (bbox[0], bbox[3] - 1),
                        new_text,
                        fontsize=font_size,
                        fontname="helv",
                        color=(0, 0, 0),
                    )
                    total_found = True
                    break

    return doc


def extract_question_image(
    pdf_path: str, region: dict, dpi: int = 200, new_q_num: int | None = None
) -> list[PILImage.Image] | None:
    if not os.path.exists(pdf_path):
        return None

    if new_q_num is not None:
        doc = overlay_question_number(pdf_path, region, new_q_num)
        if doc is None:
            doc = fitz.open(pdf_path)
    else:
        doc = fitz.open(pdf_path)

    images = []
    start_page = region["start_page"]
    start_y = region["start_y"]

    first_page = doc[start_page]
    if start_y > first_page.rect.height - 60:
        start_page += 1
        start_y = 30

    for page_idx in range(start_page, region["end_page"] + 1):
        page = doc[page_idx]
        page_rect = page.rect
        left_margin = 35
        right_margin = page_rect.width - 35

        if page_idx == start_page and page_idx == region["end_page"]:
            clip = fitz.Rect(left_margin, start_y, right_margin, region["end_y"])
        elif page_idx == start_page:
            clip = fitz.Rect(
                left_margin, start_y, right_margin, page_rect.height - 30
            )
        elif page_idx == region["end_page"]:
            clip = fitz.Rect(left_margin, 30, right_margin, region["end_y"])
        else:
            clip = fitz.Rect(left_margin, 30, right_margin, page_rect.height - 30)

        clip = clip & page.rect
        if clip.is_empty or clip.width < 10 or clip.height < 10:
            continue

        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        try:
            pix = page.get_pixmap(matrix=mat, clip=clip)
            img_data = pix.tobytes("png")
            img = PILImage.open(BytesIO(img_data))
            images.append(img)
        except Exception:
            continue

    doc.close()
    return images


def trim_bottom_whitespace(
    img: PILImage.Image, threshold: int = 245, min_content_rows: int = 20
) -> PILImage.Image:
    import numpy as np

    arr = np.array(img.convert("L"))
    row_means = arr.mean(axis=1)
    content_rows = np.where(row_means < threshold)[0]
    if len(content_rows) < min_content_rows:
        return img
    last_content_row = content_rows[-1]
    crop_bottom = min(last_content_row + 40, arr.shape[0])
    if crop_bottom < arr.shape[0] * 0.7:
        return img.crop((0, 0, img.width, crop_bottom))
    return img


# ============================================================
# TOPIC FORMATTING
# ============================================================

TOPIC_NAMES = {
    "algebra.expressions": "Expressions & Simplifying",
    "algebra.equations_linear": "Linear Equations",
    "algebra.quadratic_equations": "Quadratic Equations",
    "algebra.quadratic_graphs": "Quadratic Graphs",
    "algebra.simultaneous_equations": "Simultaneous Equations",
    "algebra.inequalities": "Inequalities",
    "algebra.sequences": "Sequences (nth term)",
    "algebra.straight_line_graphs": "Straight Line Graphs",
    "algebra.proof": "Algebraic Proof",
    "algebra.rearranging": "Rearranging Formulae",
    "algebra.substitution": "Substitution",
    "algebra.indices": "Indices (Algebraic)",
    "algebra.graph_transformations": "Graph Transformations",
    "algebra.velocity_time_graphs": "Velocity-Time Graphs",
    "algebra.algebraic_fractions": "Algebraic Fractions",
    "algebra.functions": "Functions",
    "algebra.iteration": "Iteration",
    "number.percentages": "Percentages",
    "number.fractions": "Fractions",
    "number.factors_primes": "Factors, Multiples & Primes",
    "number.standard_form": "Standard Form",
    "number.surds": "Surds",
    "number.indices_powers": "Indices & Powers",
    "number.bounds": "Bounds & Error Intervals",
    "number.rounding_estimation": "Estimation & Rounding",
    "number.operations": "Number Operations",
    "ratio.ratio": "Ratio",
    "ratio.compound_measures": "Compound Measures",
    "ratio.growth_decay": "Growth & Decay",
    "ratio.proportion": "Proportion",
    "geometry.area_perimeter": "Area & Perimeter",
    "geometry.volume_surface_area": "Volume & Surface Area",
    "geometry.angles": "Angles & Polygons",
    "geometry.trigonometry": "Trigonometry (SOHCAHTOA)",
    "geometry.pythagoras": "Pythagoras' Theorem",
    "geometry.transformations": "Transformations",
    "geometry.constructions_loci": "Constructions & Loci",
    "geometry.bearings": "Bearings",
    "geometry.similar_shapes": "Similar Shapes & Congruence",
    "geometry.sine_cosine_rule": "Sine & Cosine Rules",
    "geometry.vectors": "Vectors",
    "geometry.circle_theorems": "Circle Theorems",
    "geometry.equation_of_circle": "Equation of a Circle",
    "probability.basic": "Basic Probability",
    "probability.combined": "Combined Probability",
    "probability.tree_diagrams": "Tree Diagrams",
    "probability.venn_diagrams": "Venn Diagrams (Probability)",
    "probability.conditional": "Conditional Probability",
    "statistics.averages": "Averages & Range",
    "statistics.data_representation": "Data Representation",
    "statistics.cumulative_frequency": "Cumulative Frequency",
    "statistics.histograms": "Histograms",
    "statistics.scatter_graphs": "Scatter Graphs",
    "statistics.sampling": "Sampling",
    "statistics.pie_charts": "Pie Charts",
    "statistics.frequency_polygons": "Frequency Polygons",
    "statistics.box_plots": "Box Plots",
}


def format_topic_name(topic: str) -> str:
    return TOPIC_NAMES.get(
        topic, topic.replace(".", ": ").replace("_", " ").title()
    )


# ============================================================
# PDF BUILDER
# ============================================================


def build_front_page(
    c, paper_title: str, questions_info: list[dict], calculator: bool = True, time_mins: int = 90
):
    width, height = A4
    c.setFillColor((1, 1, 1))
    c.rect(0, 0, width, height, fill=1)

    total_marks = sum(q["marks"] for q in questions_info)

    # Header box
    c.setStrokeColor((0, 0, 0))
    c.setLineWidth(2)
    c.rect(20 * mm, height - 48 * mm, width - 40 * mm, 40 * mm, stroke=1, fill=0)

    c.setFillColor((0, 0, 0))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 18 * mm, "GCSE Mathematics")

    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 26 * mm, paper_title)

    c.setFont("Helvetica", 10)
    calc_text = "Calculator" if calculator else "Non-Calculator"
    c.drawCentredString(
        width / 2, height - 33 * mm, f"Higher Tier — {calc_text}"
    )

    c.setFont("Helvetica", 9)
    c.drawCentredString(
        width / 2,
        height - 40 * mm,
        f"Time: {time_mins} minutes  |  Total Marks: {total_marks}",
    )

    # Name / Class fields
    y = height - 55 * mm
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, "Name: .............................................................")
    c.drawString(120 * mm, y, "Class: ........................")

    # Instructions box
    y -= 8 * mm
    c.setLineWidth(1)
    c.rect(20 * mm, y - 38 * mm, width - 40 * mm, 38 * mm, stroke=1, fill=0)

    c.setFont("Helvetica-Bold", 9)
    c.drawString(25 * mm, y - 4 * mm, "Instructions")

    c.setFont("Helvetica", 8)
    instructions = [
        "• Use black ink or ball-point pen.",
        "• Answer all questions. You must show all your working.",
        "• Diagrams are NOT accurately drawn, unless otherwise indicated.",
        f"• {'Calculators may be used.' if calculator else 'Calculators must NOT be used.'}",
        "• Questions are sourced from Edexcel GCSE past papers.",
    ]

    iy = y - 12 * mm
    for inst in instructions:
        c.drawString(25 * mm, iy, inst)
        iy -= 4.5 * mm

    # Topic index table
    y = y - 38 * mm - 5 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(25 * mm, y, "Question Topics")
    c.setFont("Helvetica", 7.5)
    c.drawString(
        25 * mm,
        y - 4 * mm,
        "Use this to identify areas of strength and weakness after marking.",
    )

    y -= 12 * mm
    c.setFont("Helvetica-Bold", 8)
    c.drawString(25 * mm, y, "Q")
    c.drawString(35 * mm, y, "Topic")
    c.drawString(130 * mm, y, "Marks")
    c.drawString(150 * mm, y, "Score")

    c.setLineWidth(0.5)
    y -= 2 * mm
    c.line(25 * mm, y, 170 * mm, y)
    y -= 3.5 * mm

    c.setFont("Helvetica", 8)
    row_height = 4.8 * mm
    for i, q in enumerate(questions_info):
        topic_display = format_topic_name(q["topic"])
        c.drawString(25 * mm, y, str(i + 1))
        c.drawString(35 * mm, y, topic_display)
        c.drawString(133 * mm, y, str(q["marks"]))
        c.rect(150 * mm, y - 1 * mm, 13 * mm, 4.5 * mm, stroke=1, fill=0)
        y -= row_height

    y -= 1 * mm
    c.line(25 * mm, y + 3 * mm, 170 * mm, y + 3 * mm)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(25 * mm, y, "TOTAL")
    c.drawString(133 * mm, y, str(total_marks))
    c.rect(150 * mm, y - 1 * mm, 13 * mm, 4.5 * mm, stroke=1, fill=0)

    y -= 5.5 * mm
    c.setFont("Helvetica", 8)
    c.drawString(25 * mm, y, "Percentage")
    c.rect(150 * mm, y - 1 * mm, 13 * mm, 4.5 * mm, stroke=1, fill=0)

    if y < 30 * mm:
        c.showPage()
        y = height - 25 * mm

    # Grade boundaries
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 8)
    c.drawString(25 * mm, y, "Approximate Grade Boundaries (Higher)")
    y -= 4.5 * mm
    c.setFont("Helvetica", 7.5)
    boundaries = [
        f"Grade 9: {int(total_marks * 0.80)}+",
        f"Grade 8: {int(total_marks * 0.70)}–{int(total_marks * 0.80) - 1}",
        f"Grade 7: {int(total_marks * 0.58)}–{int(total_marks * 0.70) - 1}",
        f"Grade 6: {int(total_marks * 0.46)}–{int(total_marks * 0.58) - 1}",
        f"Grade 5: {int(total_marks * 0.34)}–{int(total_marks * 0.46) - 1}",
        f"Grade 4: {int(total_marks * 0.22)}–{int(total_marks * 0.34) - 1}",
    ]
    for b in boundaries:
        c.drawString(30 * mm, y, b)
        y -= 3.5 * mm

    c.showPage()


def build_question_pages(c, selected_questions: list[dict]):
    width, height = A4
    from reportlab.lib.utils import ImageReader

    for i, q in enumerate(selected_questions):
        q_num_in_paper = i + 1
        source_pdf = get_source_pdf_path(q)
        original_q_num = q["question_number"]

        region = find_question_region(source_pdf, original_q_num)
        if not region:
            add_text_question(c, q, q_num_in_paper, width, height)
            continue

        images = extract_question_image(
            source_pdf, region, new_q_num=q_num_in_paper
        )
        if not images:
            add_text_question(c, q, q_num_in_paper, width, height)
            continue

        trimmed_images = []
        for img in images:
            if img.height < 50 or img.width < 100:
                continue
            trimmed = trim_bottom_whitespace(img)
            if trimmed and trimmed.height >= 50:
                trimmed_images.append(trimmed)
            elif img.height >= 50:
                trimmed_images.append(img)

        if not trimmed_images:
            trimmed_images = images

        page_y = height - 18 * mm
        first_of_question = True

        for img in trimmed_images:
            img_w, img_h = img.size
            max_width = width - 30 * mm
            scale = min(max_width / img_w, 1.0)
            draw_w = img_w * scale
            draw_h = img_h * scale

            if draw_h > page_y - 15 * mm:
                if not first_of_question:
                    c.showPage()
                page_y = height - 18 * mm

            if first_of_question:
                mark_word = "mark" if q["marks"] == 1 else "marks"
                c.setFont("Helvetica-Bold", 10)
                c.drawString(15 * mm, height - 12 * mm, f"Q{q_num_in_paper}")
                c.setFont("Helvetica", 8)
                c.drawRightString(
                    width - 15 * mm,
                    height - 12 * mm,
                    f"{q['marks']} {mark_word}",
                )
                first_of_question = False

            img_buffer = BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            img_reader = ImageReader(img_buffer)

            x = (width - draw_w) / 2
            y_pos = page_y - draw_h

            c.drawImage(img_reader, x, y_pos, draw_w, draw_h)
            page_y = y_pos - 3 * mm

        c.showPage()


def add_text_question(c, q: dict, q_num: int, width: float, height: float):
    c.setFont("Helvetica-Bold", 10)
    c.drawString(15 * mm, height - 12 * mm, f"Q{q_num}")
    c.setFont("Helvetica", 8)
    c.drawRightString(
        width - 15 * mm, height - 12 * mm, f"{q['marks']} marks"
    )

    text = q.get("text_clean", q["text"])
    text = re.sub(r"^\d+\s*", "", text, count=1)

    c.setFont("Helvetica", 10)
    y = height - 22 * mm
    max_line_width = width - 45 * mm

    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            y -= 4 * mm
            continue
        words = line.split()
        current_line = ""
        for word in words:
            test_line = f"{current_line} {word}".strip()
            if c.stringWidth(test_line, "Helvetica", 10) < max_line_width:
                current_line = test_line
            else:
                if current_line:
                    c.drawString(20 * mm, y, current_line)
                    y -= 5 * mm
                current_line = word
        if current_line:
            c.drawString(20 * mm, y, current_line)
            y -= 5 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 20 * mm

    y -= 10 * mm
    c.setFont("Helvetica", 9)
    c.drawString(
        20 * mm, y, "Answer: ................................................................"
    )
    c.showPage()


# ============================================================
# API ENDPOINT
# ============================================================


@app.get("/api/health")
def health():
    return {"status": "ok", "questions": len(load_questions())}


@app.get("/api/topics")
def get_topics():
    """Return the topic name mapping for the frontend."""
    return TOPIC_NAMES


@app.post("/api/generate")
def generate_paper(req: GenerateRequest):
    questions = load_questions()

    title = req.title or f"MockMint {'Calculator' if req.calculator else 'Non-Calculator'} Paper"

    selected = select_questions(
        questions=questions,
        tier=req.tier,
        calculator=req.calculator,
        topics=req.topics,
        target_marks=req.targetMarks,
        excluded_topics=req.excludedTopics,
        seed=req.seed,
    )

    if not selected:
        raise HTTPException(
            status_code=400,
            detail="No valid questions found for the given configuration. Try broadening your topic selection.",
        )

    total_marks = sum(q["marks"] for q in selected)

    # Build PDF
    buf = BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)

    time_mins = max(60, int(total_marks * 1.125))  # ~1.125 min per mark
    build_front_page(c, title, selected, calculator=req.calculator, time_mins=time_mins)
    build_question_pages(c, selected)

    c.save()
    buf.seek(0)

    # Also return metadata as headers
    headers = {
        "X-Paper-Questions": str(len(selected)),
        "X-Paper-Marks": str(total_marks),
        "X-Paper-Topics": ",".join(sorted(set(q["topic"] for q in selected))),
        "X-Paper-Tier": req.tier,
        "X-Paper-Calculator": str(req.calculator).lower(),
    }

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="mockmint-paper.pdf"',
            **headers,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
