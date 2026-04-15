"""Generate a formatted PDF report for a project's wiring documentation."""

import io
from supabase import Client

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


HEADER_BG = colors.HexColor("#334155")  # slate-700
HEADER_FG = colors.white
ROW_ALT_BG = colors.HexColor("#f1f5f9")  # slate-100


def _styled_table(data: list[list], col_widths: list[float] | None = None) -> Table:
    """Build a table with a styled header row and alternating row colors."""
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style_commands: list = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        # Body
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    # Alternating row backgrounds
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_commands.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT_BG))

    table.setStyle(TableStyle(style_commands))
    return table


async def _resolve_terminal_label(
    terminal_id: str | None,
    end_type: str,
    elements_cache: dict[str, dict],
    terminals_cache: dict[str, dict],
) -> str:
    if end_type == "external":
        return "External"
    if end_type == "unknown":
        return "Unknown"
    if not terminal_id:
        return "Unknown"
    terminal = terminals_cache.get(terminal_id)
    if not terminal:
        return "?"
    element = elements_cache.get(terminal["element_id"])
    el_label = (element or {}).get("designation") or (element or {}).get("name") or "?"
    t_label = terminal.get("designation") or "?"
    return f"{el_label}:{t_label}"


async def generate_pdf(sb: Client, project_id: str) -> io.BytesIO:
    """Query all project data and return a formatted PDF report."""
    # Fetch all data
    project_resp = sb.table("projects").select("*").eq("id", project_id).execute()
    if not project_resp.data:
        raise ValueError(f"Project {project_id} not found")
    project = project_resp.data[0]

    machines_resp = sb.table("machines").select("*").eq("project_id", project_id).execute()
    machines = machines_resp.data or []
    machine_ids = [m["id"] for m in machines]

    elements: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("elements").select("*").eq("machine_id", mid).execute()
        elements.extend(resp.data or [])
    element_ids = [e["id"] for e in elements]
    elements_cache = {e["id"]: e for e in elements}

    terminals: list[dict] = []
    for eid in element_ids:
        resp = sb.table("terminals").select("*").eq("element_id", eid).execute()
        terminals.extend(resp.data or [])
    terminals_cache = {t["id"]: t for t in terminals}
    # Group terminals by element
    terminals_by_element: dict[str, list[dict]] = {}
    for t in terminals:
        terminals_by_element.setdefault(t["element_id"], []).append(t)

    cables: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("cables").select("*").eq("machine_id", mid).execute()
        cables.extend(resp.data or [])
    cables_cache = {c["id"]: c for c in cables}

    wires: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("wires").select("*").eq("machine_id", mid).execute()
        wires.extend(resp.data or [])

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "CoverTitle", parent=styles["Title"], fontSize=24, spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        "SectionTitle", parent=styles["Heading2"], fontSize=14,
        spaceBefore=16, spaceAfter=8, textColor=HEADER_BG,
    ))
    styles.add(ParagraphStyle(
        "DetailText", parent=styles["Normal"], fontSize=10, spaceAfter=4,
    ))

    story: list = []

    # --- Cover Page ---
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph(project.get("name") or "Untitled Project", styles["CoverTitle"]))
    story.append(Spacer(1, 0.3 * inch))

    cover_details = [
        ("Date", project.get("date_started")),
        ("Performed By", project.get("performed_by")),
        ("Reason for Work", project.get("reason_for_work")),
    ]
    for label, value in cover_details:
        if value:
            story.append(Paragraph(f"<b>{label}:</b> {value}", styles["DetailText"]))

    story.append(PageBreak())

    # --- Machine Details ---
    if machines:
        machine = machines[0]  # v1: one machine per project
        story.append(Paragraph("Machine Details", styles["SectionTitle"]))

        machine_fields = [
            ("Manufacturer", machine.get("manufacturer")),
            ("Model Number", machine.get("model_number")),
            ("Serial Number", machine.get("serial_number")),
            ("Date Manufactured", machine.get("date_manufactured")),
            ("Voltage", machine.get("voltage")),
            ("Amperage", machine.get("amperage")),
            ("Phases", machine.get("phases")),
            ("Control Voltage", machine.get("control_voltage")),
        ]
        for label, value in machine_fields:
            if value:
                story.append(Paragraph(f"<b>{label}:</b> {value}", styles["DetailText"]))

        story.append(Spacer(1, 0.3 * inch))

    # --- Elements & Terminals ---
    if elements:
        story.append(Paragraph("Elements &amp; Terminals", styles["SectionTitle"]))

        page_width = letter[0] - 1.2 * inch
        el_data = [["Designation", "Name", "Type", "Rating", "Terminals"]]

        for el in sorted(elements, key=lambda e: e.get("designation") or e.get("name") or ""):
            el_terminals = terminals_by_element.get(el["id"], [])
            terminal_str = ", ".join(
                t.get("designation") or "?"
                for t in sorted(el_terminals, key=lambda t: t.get("designation") or "")
            )
            el_data.append([
                el.get("designation") or "",
                el.get("name") or "",
                el.get("type") or "",
                el.get("rating") or "",
                Paragraph(terminal_str, styles["Normal"]) if len(terminal_str) > 30 else terminal_str,
            ])

        col_w = [0.12, 0.18, 0.18, 0.12, 0.40]
        table = _styled_table(el_data, [page_width * w for w in col_w])
        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    # --- Cable Summary ---
    if cables:
        story.append(Paragraph("Cable Summary", styles["SectionTitle"]))

        page_width = letter[0] - 1.2 * inch
        cable_data = [["Designation", "Type", "Gauge", "Wires", "Length", "Part Number"]]
        for c in sorted(cables, key=lambda c: c.get("designation") or ""):
            cable_data.append([
                c.get("designation") or "",
                c.get("cable_type") or "",
                c.get("wire_gauge") or "",
                str(c.get("num_wires") or ""),
                c.get("length") or "",
                c.get("part_number") or "",
            ])

        col_w = [0.18, 0.18, 0.14, 0.10, 0.14, 0.26]
        table = _styled_table(cable_data, [page_width * w for w in col_w])
        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    # --- Wire Schedule ---
    if wires:
        story.append(Paragraph("Wire Schedule", styles["SectionTitle"]))

        page_width = letter[0] - 1.2 * inch
        wire_data = [["Designation", "Gauge", "Color", "Type", "End 1", "End 2", "Cable", "Notes"]]

        for w in sorted(wires, key=lambda w: w.get("designation") or ""):
            end1 = await _resolve_terminal_label(
                w.get("end1_terminal_id"), w.get("end1_type", "unknown"),
                elements_cache, terminals_cache,
            )
            end2 = await _resolve_terminal_label(
                w.get("end2_terminal_id"), w.get("end2_type", "unknown"),
                elements_cache, terminals_cache,
            )
            cable_label = ""
            if w.get("cable_id") and w["cable_id"] in cables_cache:
                cable_label = cables_cache[w["cable_id"]].get("designation") or ""

            notes_parts = []
            if w.get("end1_note"):
                notes_parts.append(f"E1: {w['end1_note']}")
            if w.get("end2_note"):
                notes_parts.append(f"E2: {w['end2_note']}")
            notes = "; ".join(notes_parts)

            wire_data.append([
                w.get("designation") or "",
                w.get("gauge") or "",
                w.get("color") or "",
                w.get("wire_type") or "",
                end1,
                end2,
                cable_label,
                Paragraph(notes, styles["Normal"]) if len(notes) > 20 else notes,
            ])

        col_w = [0.11, 0.09, 0.09, 0.09, 0.14, 0.14, 0.12, 0.22]
        table = _styled_table(wire_data, [page_width * w for w in col_w])
        story.append(table)

    # No data at all
    if not elements and not cables and not wires:
        story.append(Paragraph("No wiring data recorded for this project.", styles["DetailText"]))

    doc.build(story)
    buffer.seek(0)
    return buffer
