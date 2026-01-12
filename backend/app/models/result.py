from sqlalchemy import Column, Integer, String, ForeignKey, Float
from app.database import Base

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    score = Column(Float)
    feedback = Column(String)
