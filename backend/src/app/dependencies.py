from typing import Annotated

from fastapi import Depends, Header, HTTPException
from supabase import create_client, Client

from .config import settings


def get_supabase_admin() -> Client:
    """Supabase client using the service role key (for backend operations)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user(authorization: Annotated[str, Header()]) -> dict:
    """Validate the JWT from the Authorization header and return the user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")
    client = get_supabase_admin()
    try:
        user = client.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {"id": user.user.id, "email": user.user.email}


SupabaseAdmin = Annotated[Client, Depends(get_supabase_admin)]
CurrentUser = Annotated[dict, Depends(get_current_user)]
