from fastapi import APIRouter

from ..dependencies import CurrentUser, SupabaseAdmin

router = APIRouter(tags=["export"])


@router.get("/export/{project_id}/csv")
async def export_csv(project_id: str, user: CurrentUser, sb: SupabaseAdmin):
    """Export project data as a ZIP of CSV files. (Placeholder)"""
    # TODO: implement CSV export
    return {"message": f"CSV export for project {project_id} - not yet implemented"}


@router.get("/export/{project_id}/pdf")
async def export_pdf(project_id: str, user: CurrentUser, sb: SupabaseAdmin):
    """Export project data as a formatted PDF. (Placeholder)"""
    # TODO: implement PDF export
    return {"message": f"PDF export for project {project_id} - not yet implemented"}
