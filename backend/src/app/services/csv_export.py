"""Generate a ZIP of CSV files for a project's wiring documentation."""

import csv
import io
import zipfile
from supabase import Client


def _sanitize_filename(name: str) -> str:
    """Remove characters that are unsafe for filenames."""
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip()


async def _resolve_terminal_label(
    sb: Client,
    terminal_id: str | None,
    end_type: str,
    elements_cache: dict[str, dict],
    terminals_cache: dict[str, dict],
) -> str:
    """Resolve a wire endpoint to a human-readable label like 'K1:14'."""
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


def _write_csv(rows: list[dict], columns: list[str]) -> str:
    """Write a list of dicts to a CSV string with the given column order."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue()


async def generate_csv_zip(sb: Client, project_id: str) -> io.BytesIO:
    """Query all project data and return a ZIP archive of CSV files."""
    # Fetch project
    project_resp = sb.table("projects").select("*").eq("id", project_id).execute()
    if not project_resp.data:
        raise ValueError(f"Project {project_id} not found")
    project = project_resp.data[0]
    project_name = _sanitize_filename(project.get("name") or "project")

    # Fetch machine
    machines_resp = sb.table("machines").select("*").eq("project_id", project_id).execute()
    machines = machines_resp.data or []
    machine_ids = [m["id"] for m in machines]

    # Fetch elements
    elements: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("elements").select("*").eq("machine_id", mid).execute()
        elements.extend(resp.data or [])
    element_ids = [e["id"] for e in elements]
    elements_cache = {e["id"]: e for e in elements}

    # Fetch terminals
    terminals: list[dict] = []
    for eid in element_ids:
        resp = sb.table("terminals").select("*").eq("element_id", eid).execute()
        terminals.extend(resp.data or [])
    terminals_cache = {t["id"]: t for t in terminals}

    # Fetch cables
    cables: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("cables").select("*").eq("machine_id", mid).execute()
        cables.extend(resp.data or [])
    cables_cache = {c["id"]: c for c in cables}

    # Fetch wires
    wires: list[dict] = []
    for mid in machine_ids:
        resp = sb.table("wires").select("*").eq("machine_id", mid).execute()
        wires.extend(resp.data or [])

    # Build enriched wire rows with resolved endpoint labels
    wire_rows = []
    for w in wires:
        end1_label = await _resolve_terminal_label(
            sb, w.get("end1_terminal_id"), w.get("end1_type", "unknown"),
            elements_cache, terminals_cache,
        )
        end2_label = await _resolve_terminal_label(
            sb, w.get("end2_terminal_id"), w.get("end2_type", "unknown"),
            elements_cache, terminals_cache,
        )
        cable_label = ""
        if w.get("cable_id") and w["cable_id"] in cables_cache:
            cable_label = cables_cache[w["cable_id"]].get("designation") or ""

        wire_rows.append({
            "designation": w.get("designation") or "",
            "gauge": w.get("gauge") or "",
            "color": w.get("color") or "",
            "wire_type": w.get("wire_type") or "",
            "length": w.get("length") or "",
            "end1": end1_label,
            "end1_note": w.get("end1_note") or "",
            "end2": end2_label,
            "end2_note": w.get("end2_note") or "",
            "cable": cable_label,
        })

    # Build ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Project CSV
        zf.writestr(
            f"{project_name}_project.csv",
            _write_csv(
                [project],
                ["id", "name", "date_started", "performed_by", "reason_for_work"],
            ),
        )

        # Machine CSV
        if machines:
            zf.writestr(
                f"{project_name}_machines.csv",
                _write_csv(
                    machines,
                    ["id", "manufacturer", "model_number", "serial_number",
                     "voltage", "amperage", "phases", "control_voltage",
                     "date_manufactured"],
                ),
            )

        # Elements CSV
        if elements:
            zf.writestr(
                f"{project_name}_elements.csv",
                _write_csv(
                    elements,
                    ["id", "designation", "name", "type", "rating",
                     "part_number", "coil_rating", "default_wire_gauge",
                     "default_wire_color", "default_wire_type"],
                ),
            )

        # Terminals CSV
        if terminals:
            # Add element designation to each terminal row
            terminal_rows = []
            for t in terminals:
                el = elements_cache.get(t["element_id"], {})
                terminal_rows.append({
                    **t,
                    "element_designation": el.get("designation") or el.get("name") or "",
                })
            zf.writestr(
                f"{project_name}_terminals.csv",
                _write_csv(
                    terminal_rows,
                    ["id", "element_designation", "designation", "purpose"],
                ),
            )

        # Cables CSV
        if cables:
            zf.writestr(
                f"{project_name}_cables.csv",
                _write_csv(
                    cables,
                    ["id", "designation", "cable_type", "wire_gauge",
                     "num_wires", "part_number", "has_ground", "wire_color",
                     "diameter", "length"],
                ),
            )

        # Wires CSV (enriched with resolved labels)
        if wire_rows:
            zf.writestr(
                f"{project_name}_wires.csv",
                _write_csv(
                    wire_rows,
                    ["designation", "gauge", "color", "wire_type", "length",
                     "end1", "end1_note", "end2", "end2_note", "cable"],
                ),
            )

    zip_buffer.seek(0)
    return zip_buffer
