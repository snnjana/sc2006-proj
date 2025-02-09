import asyncio
from fastapi import APIRouter, HTTPException
from typing import List, Dict
import requests
from bs4 import BeautifulSoup

router = APIRouter()

@router.get("/room-images", response_model=List[Dict[str, str]])
async def get_room_images():
    """
    Fetches a list of dictionaries, each containing a URL of an image of a room interior in Singapore.

    The images are fetched in batches from Bing Image Search using the query "apartment interior singapore".
    The number of batches and the size of each batch can be configured using the `limit` and `batch_size`
    parameters of the `fetch_room_images_in_batches` function.

    If no images are found, a 404 error is raised.
    If an error occurs while fetching the images, a 500 error is raised.

    Args:
        None

    Returns:
        List[Dict[str, str]]: A list of dictionaries, each containing a URL of an image of a room interior.

    Raises:
        HTTPException: If no images are found or an error occurs while fetching the images.
    """
    try:
        query = f"apartment interior singapore"
        images = await fetch_room_images_in_batches(query, limit=100, batch_size=20)
        if not images:
            raise HTTPException(status_code=404, detail="No images found")
        return images
    except Exception as e:
        print("Error fetching images:", e)
        raise HTTPException(status_code=500, detail="Error fetching images")

async def fetch_room_images_in_batches(query: str, limit: int, batch_size: int) -> List[Dict[str, str]]:
    """
    Fetches images in batches based on a search query using Bing Image Search.

    Args:
        query (str): The search query for fetching images.
        limit (int): The maximum number of images to fetch.
        batch_size (int): The size of each batch for fetching images.

    Returns:
        List[Dict[str, str]]: A list of dictionaries, each containing the URL of an image.

    """
    tasks = []
    for _ in range(0, limit, batch_size):
        tasks.append(
            asyncio.to_thread(
                fetch_image_batch, query, min(batch_size, limit)
            )
        )
    results = await asyncio.gather(*tasks)
    images = [image for batch in results for image in batch]
    return images[:limit]

def fetch_image_batch(query: str, batch_size: int) -> List[Dict[str, str]]:
    """
    Fetches a batch of image URLs based on a search query using Bing Image Search.

    Args:
        query (str): The search query for fetching images.
        batch_size (int): The number of images to fetch in the batch.

    Returns:
        List[Dict[str, str]]: A list of dictionaries, each containing the URL of an image.
    """
    search_url = f"https://www.bing.com/images/search?q={query}"
    response = requests.get(search_url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    image_tags = soup.find_all('img', class_='mimg', limit=batch_size)
    image_urls = [img['src'] for img in image_tags if 'src' in img.attrs]

    return [{"image_url": url} for url in image_urls]