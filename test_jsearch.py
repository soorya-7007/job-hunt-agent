import requests

url = "https://jsearch.p.rapidapi.com/search"
querystring = {"query":"Python Developer in Texas, USA","page":"1","num_pages":"1"}
headers = {
    "X-RapidAPI-Key": "2c261b2afemshe8385b62f368650p157987jsn508fad337c19",
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
}
response = requests.get(url, headers=headers, params=querystring)
print("Status Code:", response.status_code)
print("Body:", response.text)
