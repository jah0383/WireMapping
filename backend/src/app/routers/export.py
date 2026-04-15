from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..dependencies import CurrentUser, SupabaseAdmin
from ..services.csv_export import generate_csv_zip
from ..services.pdf_export import generate_pdf

router = APIRouter(tags=["export"])


def _sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip()


async def _get_project_name(sb, project_id: str) -> str:
    resp = sb.table("projects").select("name").eq("id", project_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return resp.data[0].get("name") or "project"


@router.get("/export/{project_id}/csv")
async def export_csv(project_id: str, user: CurrentUser, sb: SupabaseAdmin):
    """Export project data as a ZIP of CSV files."""
    project_name = await _get_project_name(sb, project_id)
    safe_name = _sanitize_filename(project_name)

    try:
        zip_buffer = await generate_csv_zip(sb, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_export.zip"',
        },
    )


@router.get("/export/{project_id}/pdf")
async def export_pdf(project_id: str, user: CurrentUser, sb: SupabaseAdmin):
    """Export project data as a formatted PDF report."""
    project_name = await _get_project_name(sb, project_id)
    safe_name = _sanitize_filename(project_name)

    try:
        pdf_buffer = await generate_pdf(sb, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_report.pdf"',
        },
    )
