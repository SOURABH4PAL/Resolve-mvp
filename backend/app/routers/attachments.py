from typing import List
import os
from fastapi import APIRouter, Depends, UploadFile, File, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
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
    """Upload single attachment to a ticket."""
    return await ticket_service.add_attachment(db, ticket_id, file, current_user)


@router.post("/tickets/{ticket_id}/attachments/multiple", response_model=List[TicketAttachmentRead], status_code=status.HTTP_201_CREATED)
async def upload_multiple_attachments(
    ticket_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload multiple attachments to a ticket in one operation."""
    return await ticket_service.add_multiple_attachments(db, ticket_id, files, current_user)


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


@router.get("/tickets/{ticket_id}/attachments/{attachment_id}", response_model=TicketAttachmentRead)
def get_attachment_detail(
    ticket_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve metadata of a specific ticket attachment."""
    ticket_service.get_ticket_by_id(db, ticket_id, current_user)
    att = db.query(TicketAttachment).filter(
        TicketAttachment.id == attachment_id,
        TicketAttachment.ticket_id == ticket_id,
    ).first()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    return att


@router.delete("/tickets/{ticket_id}/attachments/{attachment_id}", status_code=status.HTTP_200_OK)
def delete_attachment(
    ticket_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an attachment (uploader, ticket creator, or SUPER_ADMIN)."""
    ticket = ticket_service.get_ticket_by_id(db, ticket_id, current_user)
    att = db.query(TicketAttachment).filter(
        TicketAttachment.id == attachment_id,
        TicketAttachment.ticket_id == ticket.id,
    ).first()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_uploader = att.uploaded_by == current_user.id
    is_creator = ticket.created_by == current_user.id
    if not is_admin and not is_uploader and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the uploader, ticket creator, or SUPER_ADMIN can delete this attachment",
        )

    try:
        if os.path.exists(att.file_path):
            os.remove(att.file_path)
    except Exception:
        pass

    db.delete(att)
    db.commit()
    return {"detail": "Attachment deleted successfully", "deleted": True}
