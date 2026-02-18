import requests

class SupabaseClient:
    def __init__(self, url: str | None, key: str | None):
        self.url = url
        self.key = key
        self.is_configured = bool(url and key)

    def _headers(self):
        return {"apikey": self.key or "", "Authorization": f"Bearer {self.key or ''}", "Content-Type": "application/json"}

    def insert(self, table: str, payload: dict):
        if not self.is_configured:
            return {}
        resp = requests.post(f"{self.url}/rest/v1/{table}", headers=self._headers(), json=payload, params={"select": "*"})
        if resp.ok:
            data = resp.json()
            return data[0] if isinstance(data, list) and data else data
        return {}

    def update(self, table: str, payload: dict, key_column: str, key_value: str):
        if not self.is_configured:
            return {}
        resp = requests.patch(f"{self.url}/rest/v1/{table}", headers=self._headers(), json=payload, params={key_column: "eq." + key_value})
        return resp.json() if resp.ok else {}

