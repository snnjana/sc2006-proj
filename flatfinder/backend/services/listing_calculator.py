def calculate_grant(salary, flat_type):
    """Calculate the total grant based on salary and flat type."""
    singles_grant = 0
    enhanced_grant = 0

    if salary <= 7000:
        if flat_type in ["2-Room", "3-Room", "4-Room"]:
            singles_grant = 40000
        elif flat_type == "5-Room":
            singles_grant = 25000

        if salary <= 4500:
            enhanced_grant = 60000

    total_grant = singles_grant + enhanced_grant
    return total_grant


def get_marker_color(preferred_price, listing_price, salary, flat_type, cpf_oa_balance):
    """
    Return a color to indicate if the listing is within the preferred price range.
    
    Parameters
    ----------
    preferred_price : float
        The preferred price range.
    listing_price : float
        The price of the listing.
    salary : float
        The salary of the buyer.
    flat_type : str
        The type of flat.
    cpf_oa_balance : float
        The balance of the buyer's CPF Ordinary Account.

    Returns
    -------
    str
        A color to indicate if the listing is within the preferred price range.
        Green if the listing is within the preferred price range, yellow if it's within 5% of the preferred price range, and red otherwise.
    """
    try:
        preferred_price = float(preferred_price)
        listing_price = float(listing_price)
        cpf_oa_balance = float(cpf_oa_balance)
    except ValueError:
        return "gray" 

    total_grant = calculate_grant(salary, flat_type)
    adjusted_price = listing_price - total_grant - cpf_oa_balance

    if adjusted_price <= preferred_price:
        return "green"
    elif preferred_price < adjusted_price <= preferred_price * 1.05:
        return "yellow"
    else:
        return "red"
