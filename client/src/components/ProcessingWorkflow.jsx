import React, { useEffect, useState } from "react";
import api from "../api";

const label = (value) => String(value || "").replaceAll("_", " ");

async function compressPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  if (dataUrl.length > 950000) throw new Error("This photo is still too large");
  return { dataUrl, caption: file.name.slice(0, 120) };
}

async function readPhotos(files) {
  if (files.length > 3) throw new Error("Choose no more than 3 photos");
  return Promise.all(Array.from(files).map(compressPhoto));
}

export function ProcessingTimeline({ order, showAudit = true }) {
  const processing = order.processing;
  if (!processing?.requiredStages?.length) return <p className="dg-muted text-sm">Laundry processing has not started yet.</p>;
  const completed = processing.stages.filter((stage) => stage.status === "COMPLETED").length;
  const percent = Math.round((completed / processing.requiredStages.length) * 100);
  const overdue = processing.dueAt && new Date(processing.dueAt) < new Date() && !["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status);
  return <section className="dg-processing-view">
    <div className="dg-processing-summary"><div><strong>{percent}% complete</strong><span>{completed} of {processing.requiredStages.length} stages</span></div><div className={overdue ? "is-overdue" : ""}><strong>{overdue ? "Delayed" : "Target"}</strong><span>{processing.dueAt ? new Date(processing.dueAt).toLocaleString("en-IN") : "—"}</span></div></div>
    <div className="dg-progress-track"><span style={{ width: `${percent}%` }} /></div>
    <div className={`dg-intake-status status-${processing.intake?.status?.toLowerCase()}`}><strong>Partner intake: {label(processing.intake?.status || "PENDING")}</strong>{processing.intake?.confirmedAt && <span>{processing.intake.verifiedQuantity} garments · {processing.intake.bagCount} bag(s) · {processing.intake.confirmedByName}</span>}{processing.intake?.discrepancyNote && <p>{processing.intake.discrepancyNote}</p>}</div>
    <ol className="dg-processing-stages">{processing.stages.map((stage, index) => <li key={stage.stage} className={`stage-${stage.status.toLowerCase()}`}><div className="dg-stage-number">{stage.status === "COMPLETED" ? "✓" : index + 1}</div><div><div className="flex justify-between gap-3"><strong>{label(stage.stage)}</strong><span>{label(stage.status)}</span></div>{stage.note && <p>{stage.note}</p>}{stage.issueType && <p className="dg-stage-issue"><b>{label(stage.issueType)}:</b> {stage.issueNote}</p>}{stage.completedAt && <small>Completed by {stage.updatedByName} · {new Date(stage.completedAt).toLocaleString("en-IN")}</small>}{!!stage.photos?.length && <div className="dg-photo-row">{stage.photos.map((photo, photoIndex) => <a key={photoIndex} href={photo.url || photo.dataUrl} target="_blank" rel="noreferrer"><img src={photo.url || photo.dataUrl} alt={`${label(stage.stage)} evidence ${photoIndex + 1}`} /></a>)}</div>}</div></li>)}</ol>
    {processing.qualityCheck?.status !== "PENDING" && <div className={`dg-quality-result quality-${processing.qualityCheck.status.toLowerCase()}`}><strong>Quality check {processing.qualityCheck.status.toLowerCase()}</strong>{processing.qualityCheck.notes && <p>{processing.qualityCheck.notes}</p>}<small>{processing.qualityCheck.checkedByName} · {new Date(processing.qualityCheck.checkedAt).toLocaleString("en-IN")}</small></div>}
    {showAudit && !!processing.auditTrail?.length && <details><summary>Processing audit trail</summary><ul className="dg-audit-list">{processing.auditTrail.map((entry, index) => <li key={index}><strong>{label(entry.action)}</strong>{entry.stage && ` · ${label(entry.stage)}`} · {entry.changedByName} ({entry.changedByRole}) · {new Date(entry.timestamp).toLocaleString("en-IN")}{entry.note && <><br />{entry.note}</>}</li>)}</ul></details>}
  </section>;
}

export function PartnerProcessingControls({ order, onSaved }) {
  const expected = (order.handover?.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
  const [intake, setIntake] = useState({ bagCount: 1, verifiedQuantity: expected, discrepancyNote: "" });
  const [stageForm, setStageForm] = useState({ note: "", issueType: "", issueNote: "", photos: [] });
  const [quality, setQuality] = useState({ notes: "", photos: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setIntake({ bagCount: order.processing?.intake?.bagCount || 1, verifiedQuantity: order.processing?.intake?.verifiedQuantity ?? expected, discrepancyNote: order.processing?.intake?.discrepancyNote || "" }); }, [order._id, order.processing?.intake?.confirmedAt, expected]);
  async function submit(path, body) { setSaving(true); setError(""); try { const response = await api.post(`/partner/orders/${order._id}/${path}`, body); onSaved?.(response.data.order); } catch (err) { setError(err.response?.data?.error || "Could not save this step"); } finally { setSaving(false); } }
  async function choosePhotos(event, target) { try { setError(""); const photos = await readPhotos(event.target.files); target === "quality" ? setQuality((current) => ({ ...current, photos })) : setStageForm((current) => ({ ...current, photos })); } catch (err) { setError(err.message); } event.target.value = ""; }
  if (order.status !== "PROCESSING") return null;
  const processing = order.processing;
  if (processing?.intake?.status !== "MATCHED") return <div className="dg-processing-action"><h3>Confirm laundry intake</h3><p>Count the sealed bags and garments received from the rider. Expected from handover: <b>{expected}</b>.</p><div className="dg-form-grid"><label>Bag count<input type="number" min="1" value={intake.bagCount} onChange={(event) => setIntake((current) => ({ ...current, bagCount: Number(event.target.value) }))} /></label><label>Garments verified<input type="number" min="0" value={intake.verifiedQuantity} onChange={(event) => setIntake((current) => ({ ...current, verifiedQuantity: Number(event.target.value) }))} /></label></div>{intake.verifiedQuantity !== expected && <label>Explain the difference<textarea rows="3" value={intake.discrepancyNote} onChange={(event) => setIntake((current) => ({ ...current, discrepancyNote: event.target.value }))} /></label>}{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={saving || (intake.verifiedQuantity !== expected && intake.discrepancyNote.trim().length < 3)} onClick={() => submit("intake", intake)}>{saving ? "Saving…" : "Confirm partner intake"}</button></div>;
  const current = processing.stages.find((stage) => stage.status !== "COMPLETED");
  if (!current) return <div className="dg-processing-action"><h3>Processing complete</h3><p>Every stage and quality check is complete. Mark the order ready for delivery.</p>{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { const response = await api.put(`/partner/orders/${order._id}/status`, { status: "READY" }); onSaved?.(response.data.order); } catch (err) { setError(err.response?.data?.error || "Could not mark ready"); } finally { setSaving(false); } }}>{saving ? "Updating…" : "Mark ready for delivery"}</button></div>;
  if (current.stage === "QUALITY_CHECK") return <div className="dg-processing-action"><h3>Quality check</h3><p>Inspect garment count, finish, stains, damage, and packaging readiness.</p><label>Quality notes<textarea rows="3" value={quality.notes} onChange={(event) => setQuality((state) => ({ ...state, notes: event.target.value }))} placeholder="Required when failing the check" /></label><label>Optional evidence photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => choosePhotos(event, "quality")} /></label>{!!quality.photos.length && <p className="text-xs dg-muted">{quality.photos.length} photo(s) ready</p>}{error && <div className="dg-error">{error}</div>}<div className="flex gap-2"><button className="dg-button" disabled={saving} onClick={() => submit("quality-check", { result: "PASS", ...quality })}>Pass quality check</button><button className="dg-button dg-secondary" disabled={saving || quality.notes.trim().length < 3} onClick={() => submit("quality-check", { result: "FAIL", ...quality })}>Fail and rework</button></div></div>;
  const action = current.status === "IN_PROGRESS" ? "COMPLETE" : "START";
  return <div className="dg-processing-action"><h3>{action === "START" ? "Start" : "Complete"} {label(current.stage).toLowerCase()}</h3><label>Stage note<textarea rows="2" value={stageForm.note} onChange={(event) => setStageForm((state) => ({ ...state, note: event.target.value }))} placeholder="Work completed or special handling" /></label><div className="dg-form-grid"><label>Issue, if any<select value={stageForm.issueType} onChange={(event) => setStageForm((state) => ({ ...state, issueType: event.target.value }))}><option value="">No issue</option>{["STAIN_REMAINS", "DAMAGE_FOUND", "CARE_CONCERN", "EQUIPMENT_DELAY", "OTHER"].map((issue) => <option key={issue}>{issue}</option>)}</select></label>{stageForm.issueType && <label>Issue details<input value={stageForm.issueNote} onChange={(event) => setStageForm((state) => ({ ...state, issueNote: event.target.value }))} /></label>}</div><label>Optional before/after photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => choosePhotos(event, "stage")} /></label>{!!stageForm.photos.length && <p className="text-xs dg-muted">{stageForm.photos.length} photo(s) ready</p>}{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={saving || (stageForm.issueType && stageForm.issueNote.trim().length < 3)} onClick={() => submit("processing-stage", { stage: current.stage, action, ...stageForm })}>{saving ? "Saving…" : `${action === "START" ? "Start" : "Complete"} ${label(current.stage).toLowerCase()}`}</button></div>;
}

