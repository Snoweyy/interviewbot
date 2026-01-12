class Recorder:
    async def save_recording(self, file_data: bytes, filename: str):
        # Media saving logic here
        return {"path": f"storage/recordings/{filename}"}

recorder = Recorder()
