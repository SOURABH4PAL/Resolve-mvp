from sqlalchemy.orm import Session
from app.models.ticket import Ticket


def generate_ticket_number(db: Session) -> str:
    """Generate sequential unique ticket number like TKT-000001."""
    last_ticket = db.query(Ticket).order_by(Ticket.created_at.desc()).first()
    if not last_ticket or not last_ticket.ticket_number:
        return "TKT-000001"
    
    try:
        parts = last_ticket.ticket_number.split("-")
        if len(parts) == 2 and parts[0] == "TKT":
            last_seq = int(parts[1])
            return f"TKT-{last_seq + 1:06d}"
    except (ValueError, IndexError):
        pass

    count = db.query(Ticket).count()
    return f"TKT-{count + 1:06d}"
