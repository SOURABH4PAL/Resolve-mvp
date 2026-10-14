from sqlalchemy.orm import Session
from app.models.ticket import Ticket


def generate_ticket_number(db: Session) -> str:
    """Generate sequential unique ticket number like TKT-000001."""
    last_ticket = db.query(Ticket).order_by(Ticket.ticket_number.desc()).first()
    if not last_ticket or not last_ticket.ticket_number:
        return "TKT-000001"
    
    try:
        parts = last_ticket.ticket_number.split("-")
        if len(parts) == 2 and parts[0] == "TKT":
            last_seq = int(parts[1])
            new_num = f"TKT-{last_seq + 1:06d}"
            while db.query(Ticket).filter(Ticket.ticket_number == new_num).first() is not None:
                last_seq += 1
                new_num = f"TKT-{last_seq + 1:06d}"
            return new_num
    except (ValueError, IndexError):
        pass

    count = db.query(Ticket).count()
    new_num = f"TKT-{count + 1:06d}"
    while db.query(Ticket).filter(Ticket.ticket_number == new_num).first() is not None:
        count += 1
        new_num = f"TKT-{count + 1:06d}"
    return new_num

