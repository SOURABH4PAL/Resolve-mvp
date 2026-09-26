from typing import List
import os
from fastapi import APIRouter, Depends, UploadFile, File, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.ticket_attachment import TicketAttachment
from app.schemas.ticket_attachment import TicketAttachmentRead
from app.dependencies import get_current_user
from app.services import ticket_service

router = APIRouter(tags=["Attachments"])


@router.post("/tickets/{ticket_id}/attachments", response_model=TicketAttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload attachment to a ticket."""
    return await ticket_service.add_attachment(db, ticket_id, file, current_user)


@router.get("/tickets/{ticket_id}/attachments", response_model=List[TicketAttachmentRead])
def list_attachments(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List attachments of a ticket."""
    return ticket_service.get_ticket_attachments(db, ticket_id, current_user)


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an uploaded file."""
    attachment = db.query(TicketAttachment).filter(TicketAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    # Verify access to ticket
    ticket_service.get_ticket_by_id(db, attachment.ticket_id, current_user)

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found on server")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=attachment.mime_type or "application/octet-stream"
    )
