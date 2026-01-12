from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer("all-MiniLM-L6-v2")

def evaluate_text(answer: str, ideal_answer: str):
    emb1 = model.encode([answer])
    emb2 = model.encode([ideal_answer])

    similarity = cosine_similarity(emb1, emb2)[0][0]

    return round(similarity * 100, 2)
