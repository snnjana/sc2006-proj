import requests
import pandas as pd
import json
import urllib
from urllib.parse import unquote
from fastapi import APIRouter, Query, HTTPException, Header
import datetime
import httpx
import asyncio
import random
import os
from dotenv import load_dotenv
import logging
from ..services.listing_calculator import get_marker_color

router = APIRouter()

load_dotenv()

datasetId = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc"

GOOGLE_MAPS_GEOCODING_API_KEY = os.getenv("GOOGLE_MAPS_GEOCODING_API_KEY")

async def fetch_coordinates_batch(address_batch):
    """
    Given a list of addresses, fetch their coordinates from OneMap API in batches.

    Args:
        address_batch (list): A list of addresses to fetch coordinates for.

    Returns:
        list: A list of tuples containing the coordinates of the addresses in the same order as the input.
    """
    base_url = 'https://www.onemap.gov.sg/api/common/elastic/search'
    results = []
    
    async with httpx.AsyncClient() as client:
        tasks = [
            client.get(
                f"{base_url}?searchVal={urllib.parse.quote(address)}&returnGeom=Y&getAddrDetails=Y&pageNum=1"
            )
            for address in address_batch
        ]
        responses = await asyncio.gather(*tasks)
    
    for response in responses:
        data = response.json()
        if data.get("found", 0) > 0:
            results.append((data["results"][0]["LATITUDE"], data["results"][0]["LONGITUDE"]))
        else:
            results.append((None, None))
    
    return results

def batch_addresses(addresses, batch_size=10):
    """Split list of addresses into batches."""
    for i in range(0, len(addresses), batch_size):
        yield addresses[i:i + batch_size]

async def fetch_all_coordinates(addresses):
    """
    Given a list of addresses, fetch their coordinates from OneMap API in batches and return the coordinates as a list of tuples.

    Args:
        addresses (list): A list of addresses to fetch coordinates for.

    Returns:
        list: A list of tuples containing the coordinates of the addresses in the same order as the input.
    """
    coordinates = []
    for batch in batch_addresses(addresses):
        batch_coordinates = await fetch_coordinates_batch(batch)
        coordinates.extend(batch_coordinates)
    return coordinates

async def fetch_apartments(estate: str, preferred_price: float, salary: float, flat_type: str, cpf_oa_balance: float, hdb_type: str):
    """
    Given a list of parameters, fetch the corresponding HDB resale data from data.gov.sg.

    Args:
        estate (str): The estate to fetch data for.
        preferred_price (float): The preferred price of the apartment.
        salary (float): The salary of the buyer.
        flat_type (str): The type of the apartment.
        cpf_oa_balance (float): The CPF Ordinary Account balance of the buyer.
        hdb_type (str): The type of HDB flat.

    Returns:
        pd.DataFrame: A DataFrame containing the fetched data.
    """
    preferred_price = float(preferred_price)
    salary = float(salary)
    cpf_oa_balance = float(cpf_oa_balance)
    hdb_type = hdb_type.replace('-', ' ').upper()
    flat_type = flat_type.replace('-', ' ').upper()

    def get_previous_month():        
        current_date = datetime.datetime.now()
        first_day_of_current_month = current_date.replace(day=1)
        last_day_of_previous_month = first_day_of_current_month - datetime.timedelta(days=1)
        return last_day_of_previous_month.strftime("%Y-%m")

    current_month = datetime.datetime.now().strftime("%Y-%m")
    previous_month = get_previous_month()

    def fetch_data(month):
        row_filters = {
            "month": month,
            "town": estate
        }

        if preferred_price and salary and flat_type and cpf_oa_balance and hdb_type:
            row_filters.update({
                "flat_type": hdb_type,
            })

        filters = {}
        for key, value in row_filters.items():
            filters[key] = {
                "type": "ILIKE" if isinstance(value, str) else "numeric",
                "value": str(value) if value is not None else ""
            }

        row_filters_encoded = urllib.parse.quote(json.dumps(filters))
        url = f"https://data.gov.sg/api/action/datastore_search?resource_id={datasetId}"

        if filters:
            url += "&filters=" + row_filters_encoded
        url += "&limit=200"

        response = requests.get(url)
        data = response.json()
        records = data['result']['records']
        return pd.DataFrame(records)

    df = fetch_data(current_month)

    if df.empty:
        df = fetch_data(previous_month)

    if df.empty:
        return pd.DataFrame()

    df['address'] = df['block'] + ' ' + df['street_name']
    df['resale_price'] = df['resale_price'].astype(float)

    addresses = df['address'].tolist()
    coordinates = await fetch_all_coordinates(addresses)
    df['latitude'], df['longitude'] = zip(*coordinates)

    df['color'] = df.apply(
        lambda row: get_marker_color(preferred_price, row['resale_price'], salary, flat_type, cpf_oa_balance), axis=1
    )

    return df

@router.get("/apartments")
async def get_apartments_route(
    estate: str, 
    preferred_price: float, 
    salary: float, 
    flat_type: str,
    cpf_oa_balance: float,
    hdb_type: str
):
    """
    Fetches a list of apartments based on the given estate, preferred price, salary, flat type, CPF OA balance, and HDB type.

    Args:
        estate (str): The estate to search for.
        preferred_price (float): The preferred resale price of the flat.
        salary (float): The salary of the applicant.
        flat_type (str): The type of flat to search for (e.g. 3-room, 4-room, etc.).
        cpf_oa_balance (float): The CPF Ordinary Account balance of the applicant.
        hdb_type (str): The type of HDB flat to search for (e.g. BTO, Resale, etc.).

    Returns:
        dict: A JSON-serializable dictionary containing a list of apartments.
    """
    df = await fetch_apartments(estate, preferred_price, salary, flat_type, cpf_oa_balance, hdb_type)
    return df.to_dict(orient="records")

@router.get("/apartment-details")
async def get_specific_apartment_route(
    block: str = Query(...),
    street_name: str = Query(...),
    month: str = Query(...),
):
    """
    Fetches a specific apartment based on its block, street name, and month.

    Args:
        block (str): The block number of the apartment.
        street_name (str): The street name of the apartment.
        month (str): The month of the apartment's resale data.

    Returns:
        dict: A JSON-serializable dictionary containing the details of the apartment.
    """
    filters = {
        "block": {
            "type": "ILIKE",
            "value": block
        },
        "street_name": {
            "type": "ILIKE",
            "value": street_name
        },
        "month": {
            "type": "ILIKE",
            "value": month
        }
    }
    
    row_filters_encoded = urllib.parse.quote(json.dumps(filters))
    url = f"https://data.gov.sg/api/action/datastore_search?resource_id={datasetId}&filters={row_filters_encoded}&limit=1"
 
    response = requests.get(url)
    data = response.json()
    records = data['result']['records']
    df = pd.DataFrame(records)

    if df.empty:
        raise HTTPException(status_code=404, detail="No apartment found with the given parameters.")
    
    address = f"{block} {street_name}"
    postal_code = await fetch_postal_code_by_address(address)
    df['postal_code'] = postal_code

    required_columns = [
        'month', 
        'flat_type', 
        'storey_range', 
        'floor_area_sqm', 
        'flat_model', 
        'remaining_lease', 
        'resale_price',
        'postal_code'
    ]

    return df[required_columns].to_dict(orient="records")

async def fetch_postal_code_by_address(address: str):
    """Fetch latitude, longitude, and postal code using block and street name as address."""
    base_url = 'https://www.onemap.gov.sg/api/common/elastic/search'
    url = f"{base_url}?searchVal={urllib.parse.quote(address)}&returnGeom=Y&getAddrDetails=Y&pageNum=1"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        
        if data.get("found", 0) > 0:
            result = data["results"][0]
            postal_code = result["POSTAL"]
            return postal_code
        else:
            return "Postal code not found"

@router.get("/hdb-block-image")
async def get_hdb_block_image(
    latitude: str = Query(..., description="Latitude of the HDB block"),
    longitude: str = Query(..., description="Longitude of the HDB block"),
):
    """
    Fetches an image of the HDB block at the given latitude and longitude.

    Args:
        latitude (str): Latitude of the HDB block.
        longitude (str): Longitude of the HDB block.

    Returns:
        dict: A dictionary containing the URL of the image of the HDB block.

    Raises:
        HTTPException: If no image is found for the given location, or an error occurs while fetching the image.
    """
    try:
        logging.info(f"Fetching image for coordinates: Latitude: {latitude}, Longitude: {longitude}")
 
        places_url = (
            f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
            f"location={latitude},{longitude}&rankby=distance&type=all&key={GOOGLE_MAPS_GEOCODING_API_KEY}"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(places_url)
            response.raise_for_status()
            data = response.json()
            
            if "results" in data and len(data["results"]) > 0:
                place_id = data["results"][0]["place_id"]
                logging.info(f"Found place ID: {place_id} for Latitude: {latitude}, Longitude: {longitude}")

                details_url = (
                    f"https://maps.googleapis.com/maps/api/place/details/json?"
                    f"place_id={place_id}&fields=photos&key={GOOGLE_MAPS_GEOCODING_API_KEY}"
                )
                
                details_response = await client.get(details_url)
                details_response.raise_for_status()
                details_data = details_response.json()
                
                if "result" in details_data and "photos" in details_data["result"]:
                    photo_reference = details_data["result"]["photos"][0]["photo_reference"]
                    image_url = (
                        f"https://maps.googleapis.com/maps/api/place/photo?"
                        f"maxwidth=400&photoreference={photo_reference}&key={GOOGLE_MAPS_GEOCODING_API_KEY}"
                    )
                    return {"image_url": image_url}
                else:
                    logging.warning(f"No photos found for place ID: {place_id}")

            raise HTTPException(status_code=404, detail="No images found for the specified location.")
        
    except httpx.HTTPStatusError as http_error:
        logging.error(f"HTTP error occurred: {str(http_error)}")
        raise HTTPException(status_code=http_error.response.status_code, detail=str(http_error))
    
    except Exception as e:
        logging.error(f"Error fetching HDB block image: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching the image.")
    
def convert_type(api_type: str) -> str:    
    """
    Converts an API type from snake_case to a human-readable format.

    Args:
        api_type (str): The type from the API, in snake_case.

    Returns:
        str: The type with spaces and capitalized.
    """
    if not api_type:
        return ""

    return api_type.replace("_", " ").capitalize()

@router.get("/nearby-amenities")
async def get_nearby_amenities(latitude: float, longitude: float):
    """
    Fetches a list of nearby amenities using the Google Places API.

    Args:
        latitude (float): The latitude of the location to search around.
        longitude (float): The longitude of the location to search around.

    Returns:
        List[Dict[str, str]]: A list of dictionaries containing the name, address,
            type, and rating of nearby amenities.
    """
    try:
        url = (
            f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
            f"location={latitude},{longitude}&rankby=distance&key={GOOGLE_MAPS_GEOCODING_API_KEY}"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
        
        if data.get("results"):
            amenities = [
                {
                    "name": amenity.get("name"),
                    "address": amenity.get("vicinity"),
                    "type": convert_type(amenity.get("types", [None])[0]),
                    "rating": amenity.get("rating"),
                }
                for amenity in data["results"]
                if not any(term in amenity.get("name", "").lower() for term in ["hdb", "block", "blk"]) 
            ]
            return amenities
        return []
    except Exception as e:
        logging.error(f"Error fetching nearby amenities: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch nearby amenities.")

