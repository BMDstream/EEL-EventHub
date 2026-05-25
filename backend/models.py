from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

class Client(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    logo_url: Optional[str] = None
    sender_name: Optional[str] = None
    reply_to: Optional[str] = None
    primary_color: str = "#0f172a"
    accent_color: str = "#94a3b8"
    heading_text: str = "Access Granted."
    body_text: str = "Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification."
    footer_text: str = "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    title: str
    description: str
    start_date: datetime
    location: str
    address: Optional[str] = None
    capacity: int
    banner_url: Optional[str] = None
    client_id: Optional[int] = Field(default=None, foreign_key="client.id")
    
    custom_fields_schema: Optional[List[Dict[str, Any]]] = Field(default=[], sa_column=Column(JSON))
    
    registrations: List["Registration"] = Relationship(
        back_populates="event", 
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class Attendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    first_name: str
    last_name: str
    company: Optional[str] = None
    
    registrations: List["Registration"] = Relationship(back_populates="attendee")

class Registration(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    pin: Optional[str] = None # 4-digit numeric PIN
    event_id: int = Field(foreign_key="event.id")
    attendee_id: int = Field(foreign_key="attendee.id")
    status: str = "confirmed" # confirmed, waitlisted, cancelled
    checked_in: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    custom_answers: Optional[Dict[str, Any]] = Field(default={}, sa_column=Column(JSON))
    
    event: Event = Relationship(back_populates="registrations")
    attendee: Attendee = Relationship(back_populates="registrations")

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password: Optional[str] = None
    role: str = "staff" # admin, manager, staff
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SystemSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    value: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
