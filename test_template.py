from fastapi import Request
from fastapi.templating import Jinja2Templates
from unittest.mock import Mock

templates = Jinja2Templates(directory="templates")
# Starlette Request requires a scope
scope = {
    "type": "http",
    "method": "GET",
    "headers": [],
}
request = Request(scope)
try:
    response = templates.TemplateResponse("index.html", {"request": request})
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
