"use client";
import { useEffect, useRef, useState } from "react";
import { InterfaceText } from "./interface-language";

type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const control = "min-h-11 rounded-lg border border-stone-400 bg-white px-4 py-2 text-sm disabled:opacity-50";

export function SpeechPractice({ languageCode, playbackLanguageCode = languageCode, text, onTranscript, onTranscribeRecording }: { languageCode: string; playbackLanguageCode?: string; text: string; onTranscript?: (text: string) => void; onTranscribeRecording?: (recording: Blob) => Promise<string> }) {
  const [notice, setNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [speechConsent, setSpeechConsent] = useState(false);
  const [recordingConsent,setRecordingConsent] = useState(false);
  const recordingTimer = useRef<number | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingType, setRecordingType] = useState("audio/webm");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recordingBlob = useRef<Blob | null>(null);
  const [transcribing,setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const active = useRef(true);
  const url = useRef("");
  useEffect(() => {
    active.current = true;
    const update = () => setVoices(window.speechSynthesis?.getVoices() || []);
    update(); window.speechSynthesis?.addEventListener("voiceschanged", update);
    return () => {
      active.current = false;
      if (recordingTimer.current) window.clearTimeout(recordingTimer.current);
      recognition.current?.stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
      recorder.current?.stream.getTracks().forEach(track => track.stop());
      if (url.current) URL.revokeObjectURL(url.current);
      window.speechSynthesis?.cancel(); window.speechSynthesis?.removeEventListener("voiceschanged", update);
    };
  }, []);
  const voice = voices.find(item => item.lang.split(/[-_]/)[0].toLowerCase() === (playbackLanguageCode === "eng" ? "en" : playbackLanguageCode));
  async function record() {
    setNotice("");
    if (recording) { recorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setNotice("Recording is unavailable in this browser. Use a supported browser with microphone access."); return; }
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const capture = new MediaRecorder(stream, {audioBitsPerSecond:64000}); recorder.current = capture; const chunks: BlobPart[] = [];
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onstop = () => {
        if (recordingTimer.current) window.clearTimeout(recordingTimer.current);
        stream?.getTracks().forEach(track => track.stop());
        if (!active.current) return;
        if (url.current) URL.revokeObjectURL(url.current);
        const blob = new Blob(chunks, { type: capture.mimeType || "audio/webm" });
        recordingBlob.current = blob;
        url.current = URL.createObjectURL(blob); setRecordingUrl(url.current); setRecordingType(blob.type); setRecording(false);
      };
      capture.onerror = () => { stream?.getTracks().forEach(track => track.stop()); if (active.current) { setRecording(false); setNotice("Recording failed. Check microphone access and retry."); } };
      capture.start(); setRecording(true); recordingTimer.current = window.setTimeout(()=>{if(capture.state === "recording")capture.stop();},60000);
    } catch { stream?.getTracks().forEach(track => track.stop()); setNotice("Microphone access was denied or unavailable. You can still type your practice."); }
  }
  function dictate() {
    setNotice("");
    if (recognizing) { recognition.current?.stop(); return; }
    if (!speechConsent) { setNotice("Allow speech processing before starting dictation."); return; }
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setNotice("Dictation is unavailable in this browser. Record for listening practice or type your text."); return; }
    const recognizer = new Constructor(); recognition.current = recognizer;
    recognizer.lang = languageCode === "eng" ? "en-KE" : languageCode === "luo" ? "luo-KE" : languageCode;
    recognizer.continuous = false; recognizer.interimResults = false;
    recognizer.onresult = event => { if (active.current) onTranscript?.(event.results[0][0].transcript); };
    recognizer.onerror = event => { if (active.current) setNotice(event.error === "language-not-supported" ? "This speech service does not support the selected language. Use recording or typed practice." : "Dictation could not complete. Check your connection and microphone permissions."); };
    recognizer.onend = () => { if (active.current) setRecognizing(false); };
    try { recognizer.start(); setRecognizing(true); } catch { setRecognizing(false); setNotice("Dictation could not start. Please retry."); }
  }
  function speak() {
    if (!voice || !window.speechSynthesis) { setNotice("Install a voice for the selected language, or use a reviewed audio recording. This device has no matching voice."); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text.slice(0, 6000)); utterance.voice = voice; utterance.lang = voice.lang; window.speechSynthesis.speak(utterance);
  }
  return <fieldset className="space-y-3 rounded-xl border border-stone-300 bg-stone-50 p-4">
    <legend className="font-semibold"><InterfaceText source="Speaking and listening practice" /></legend>
    <p className="text-sm"><InterfaceText source="Practice recordings stop after one minute and stay on this device unless you choose AI transcription. Compare with reviewed audio; no automatic pronunciation score is claimed." /></p>
    <div className="flex flex-wrap gap-2"><button type="button" className={control} onClick={() => void record()}><InterfaceText source={recording ? "Stop recording" : "Record my voice"} /></button><button type="button" className={control} disabled={!text.trim()} onClick={speak}><InterfaceText source="Listen to text" /></button><button type="button" className={control} onClick={() => window.speechSynthesis?.cancel()}><InterfaceText source="Stop playback" /></button></div>
    {onTranscript && <><label className="flex gap-2 text-sm"><input type="checkbox" checked={speechConsent} onChange={event => { setSpeechConsent(event.target.checked); if (!event.target.checked) { recognition.current?.stop(); setRecognizing(false); } }} /><InterfaceText source="I allow this browser's speech service to process my voice for dictation. Supported languages depend on the service." /></label><button type="button" className={control} disabled={!speechConsent} onClick={dictate}><InterfaceText source={recognizing ? "Stop dictation" : "Dictate text"} /></button></>}
    {onTranscribeRecording && recordingUrl && <><label className="flex gap-2 text-sm"><input type="checkbox" checked={recordingConsent} onChange={event=>setRecordingConsent(event.target.checked)}/><InterfaceText source="I allow the configured AI service to transcribe this personal recording. It will not be published."/></label><button type="button" className={control} disabled={!recordingConsent || transcribing} onClick={()=>{if(!recordingBlob.current)return;setTranscribing(true);setNotice("");void onTranscribeRecording(recordingBlob.current).then(value=>{if(active.current)onTranscript?.(value);}).catch(reason=>{if(active.current)setNotice(reason instanceof Error?reason.message:"Transcription unavailable.");}).finally(()=>{if(active.current)setTranscribing(false);});}}><InterfaceText source={transcribing?"Transcribing...":"Transcribe my recording"}/></button></>}
    {recordingUrl && <div className="space-y-2"><audio controls src={recordingUrl} className="max-w-full" /><a className="inline-block min-h-11 py-2 underline" href={recordingUrl} download={`my-practice.${recordingType.includes("mp4") ? "m4a" : recordingType.includes("ogg") ? "ogg" : "webm"}`}><InterfaceText source="Download my recording" /></a></div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </fieldset>;
}
