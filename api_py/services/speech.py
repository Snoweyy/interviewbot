import io
import asyncio
import os
import tempfile
import subprocess
import shutil
from typing import Optional
import edge_tts

# Global model references
_faster_whisper_model = None
_openai_whisper_model = None
USE_FASTER_WHISPER = True
MIN_AUDIO_BYTES = 4000

def _get_ffmpeg_bin() -> str:
    """Resolve ffmpeg executable path, preferring FFMPEG_BIN env, else PATH."""
    env_bin = os.getenv("FFMPEG_BIN")
    if env_bin and os.path.exists(env_bin):
        return env_bin
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise RuntimeError("ffmpeg not found. Set FFMPEG_BIN env or add ffmpeg to PATH.")

def get_whisper_model():
    """Lazy load Whisper model with runtime fallback"""
    global _faster_whisper_model, _openai_whisper_model, USE_FASTER_WHISPER
    
    # Try initializing faster-whisper if enabled
    if USE_FASTER_WHISPER and _faster_whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            print("Loading faster-whisper model...")
            # Use 'tiny' or 'base' for speed on CPU
            _faster_whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            print("faster-whisper loaded successfully")
        except Exception as e:
            print(f"Failed to load faster-whisper: {e}. Falling back to standard whisper.")
            USE_FASTER_WHISPER = False
            
    # Fallback to standard OpenAI whisper
    if not USE_FASTER_WHISPER and _openai_whisper_model is None:
        try:
            import whisper
            print("Loading standard openai-whisper model...")
            _openai_whisper_model = whisper.load_model("base")
            print("openai-whisper loaded successfully")
        except Exception as e:
            print(f"Failed to load openai-whisper: {e}")
            raise

    return _faster_whisper_model if USE_FASTER_WHISPER else _openai_whisper_model

def recognize_speech(audio_bytes: bytes, language_code: str = "en") -> dict:
    """
    Convert speech audio to text using Whisper.
    """
    global USE_FASTER_WHISPER
    try:
        print(f"Processing audio: {len(audio_bytes)} bytes | container=webm")
        if len(audio_bytes) < MIN_AUDIO_BYTES:
            print("Audio too short/empty - skipping STT")
            return {"transcript": "", "confidence": 0.0}

        ffmpeg_bin = _get_ffmpeg_bin()

        model = get_whisper_model()

        # Try multiple container suffixes to help ffmpeg decode correctly
        suffixes = [".ogg", ".webm"]

        # Convert to WAV 16k mono using ffmpeg for maximum compatibility
        wav_path = None
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            in_path = tmp_in.name
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
                wav_path = tmp_out.name
            cmd = [
                ffmpeg_bin, "-hide_banner", "-loglevel", "error",
                "-y", "-f", "webm", "-i", in_path,
                "-ac", "1", "-ar", "16000",
                "-vn",
                "-f", "wav", wav_path
            ]
            subprocess.run(cmd, check=True)
        except Exception as fferr:
            print(f"ffmpeg conversion to wav failed: {fferr}")
            wav_path = None
        finally:
            if os.path.exists(in_path):
                os.unlink(in_path)

        if wav_path is None or not os.path.exists(wav_path) or os.path.getsize(wav_path) < MIN_AUDIO_BYTES:
            print("Converted WAV is invalid/too small - skipping Whisper")
            return {"transcript": "", "confidence": 0.0}

        # First try faster-whisper with file paths
        if USE_FASTER_WHISPER:
            try:
                segments, info = model.transcribe(wav_path, language=language_code)
                transcript = " ".join([segment.text for segment in segments]).strip()
                print(f"Transcript (faster-whisper): {transcript}")
                os.unlink(wav_path)
                return {"transcript": transcript, "confidence": 0.9}
            except Exception as e:
                print(f"faster-whisper transcribe failed: {e}")

            # Switch to standard whisper after failures
            print("faster-whisper runtime error across formats. Switching to standard whisper.")
            USE_FASTER_WHISPER = False
            model = get_whisper_model()  # load standard model

        # Standard Whisper path (fallback or primary) with format attempts
        try:
            result = model.transcribe(wav_path, language=language_code)
            # result might be a dict or an object; handle both safely
            transcript = ""
            if isinstance(result, dict):
                transcript = (result.get("text") or "").strip()
            else:
                transcript = getattr(result, "text", "") or ""
                transcript = transcript.strip()
            print(f"Transcript (whisper): {transcript}")
            os.unlink(wav_path)
            return {"transcript": transcript, "confidence": 0.9}
        except Exception as e:
            print(f"openai-whisper transcribe failed: {e}")
        finally:
            if wav_path and os.path.exists(wav_path):
                try: os.unlink(wav_path)
                except: pass
                
    except Exception as e:
        print(f"Speech recognition error: {e}")
        import traceback
        traceback.print_exc()
        return {"transcript": "", "confidence": 0.0}


async def synthesize_speech_async(text: str, voice: str = "en-US-AriaNeural") -> dict:
    """
    Convert text to speech using Edge TTS (free, high quality).
    
    Args:
        text: Text to convert to speech
        voice: Voice name (e.g., 'en-US-AriaNeural', 'en-US-GuyNeural')
    
    Returns:
        dict with 'audioContent' (bytes), 'audioEncoding', 'sampleRate'
    """
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        return {
            "audioContent": audio_data,
            "audioEncoding": "MP3",
            "sampleRate": 24000
        }
    except Exception as e:
        print(f"TTS error: {e}")
        return {"audioContent": b"", "audioEncoding": "MP3", "sampleRate": 24000}


def synthesize_speech(text: str, voice: str = "en-US-GuyNeural") -> dict:
    """
    Synchronous wrapper for TTS.
    Uses a professional male voice by default for interview setting.
    """
    try:
        # Always create new event loop for sync wrapper to avoid conflicts
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(synthesize_speech_async(text, voice))
            return result
        finally:
            loop.close()
    except Exception as e:
        print(f"TTS wrapper error: {e}")
        import traceback
        traceback.print_exc()
        return {"audioContent": b"", "audioEncoding": "MP3", "sampleRate": 24000}
