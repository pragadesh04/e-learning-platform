import os
import logging
from typing import List

logger = logging.getLogger(__name__)

try:
    from langchain_mistralai import ChatMistralAI
    from langchain_core.prompts import ChatPromptTemplate

    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
    )

    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False


def generate_course_tags(title: str, description: str) -> List[str]:
    """Generate search tags for a course using AI"""

    if not LANGCHAIN_AVAILABLE:
        logger.warning("LangChain not available, using fallback tags")
        return generate_fallback_tags(title, description)

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        logger.warning("MISTRAL_API_KEY not set, using fallback tags")
        return generate_fallback_tags(title, description)

    prompt = f"""Generate 5-10 relevant search tags/keywords for a course with:
Title: {title}
Description: {description}

Consider:
- Main topics and subjects
- Skills learners will gain
- Related technologies or fields
- Difficulty level (beginner, intermediate, advanced)
- Industry or use cases

Return ONLY a comma-separated list of tags (no explanation).
Example output: python, programming, beginner, data science, automation"""

    try:
        llm = ChatMistralAI(
            model="mistral-large-latest", api_key=api_key, temperature=0.3
        )

        if TENACITY_AVAILABLE:

            @retry(
                stop=stop_after_attempt(3),
                wait=wait_exponential(multiplier=1, min=2, max=10),
                retry=retry_if_exception_type(Exception),
            )
            def call_llm():
                return llm.invoke(prompt)

            response = call_llm()
        else:
            response = llm.invoke(prompt)

        content = response.content.strip()

        tags = [tag.strip() for tag in content.split(",")]
        tags = [tag for tag in tags if tag and len(tag) > 1]
        tags = tags[:10]

        logger.info(f"Generated {len(tags)} tags for course: {title}")
        return tags

    except Exception as e:
        logger.error(f"Error generating tags with AI: {e}")
        return generate_fallback_tags(title, description)


def generate_fallback_tags(title: str, description: str) -> List[str]:
    """Generate basic tags from title and description without AI"""

    text = f"{title} {description}".lower()

    common_keywords = [
        "python",
        "javascript",
        "java",
        "c++",
        "c#",
        "ruby",
        "go",
        "rust",
        "web",
        "frontend",
        "backend",
        "fullstack",
        "mobile",
        "desktop",
        "data",
        "science",
        "machine",
        "learning",
        "ai",
        "artificial",
        "deep",
        "cloud",
        "aws",
        "azure",
        "gcp",
        "devops",
        "docker",
        "kubernetes",
        "database",
        "sql",
        "mongodb",
        "mysql",
        "postgresql",
        "redis",
        "react",
        "angular",
        "vue",
        "node",
        "django",
        "flask",
        "spring",
        "beginner",
        "intermediate",
        "advanced",
        "course",
        "tutorial",
        "marketing",
        "business",
        "design",
        "ui",
        "ux",
        "video",
        "photo",
        "excel",
        "powerpoint",
        "word",
        "office",
        "communication",
        "leadership",
    ]

    tags = []
    for keyword in common_keywords:
        if keyword in text:
            tags.append(keyword)

    title_words = title.split()
    for word in title_words:
        if len(word) > 3 and word.lower() not in tags:
            tags.append(word.lower())

    tags = list(set(tags))[:10]

    if not tags:
        tags = ["course", "learning", "education"]

    logger.info(f"Generated {len(tags)} fallback tags for course: {title}")
    return tags
