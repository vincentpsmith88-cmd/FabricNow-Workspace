# FabricNow AI Body Measurements — integrated workspace change

## Added to the existing app
- New **AI Body Measurements** item in the existing Workspace sidebar, immediately after Tailor Tools.
- New `BodyMeasurements` page uses the existing `api()` client, bearer authentication, selected-company header, toast system, panel/button conventions and API Growth subscription gate.
- Captures front + side (required), with back/left/right optional; records height, profile name, scan results, recent scan history and CSV export.
- Page explicitly tells users to verify estimates before fabric cutting.

## Backend integration
- `POST /api/body-measurements/scans` accepts multipart fields `front`, `side`, optional `back`, `left`, `right`, plus `height`, `unit`, `name`.
- `GET /api/body-measurements/scans` returns the signed-in user's recent scans.
- New `BodyMeasurementScan` Mongo model stores scan ownership, status, measurements, confidence, image count, engine version and output references.
- A successful worker response is required before usage is charged. The backend increments the existing API Growth `usage.segmentedCount` by the number of uploaded source images, so the existing Usage/Billing pages remain the source of truth. Overage meter events use the existing Stripe meter helper.
- Failed, rejected or unconfigured scans do not deduct image usage.

## Required engine connection — not present in supplied worker archive
Set `BODY_MEASUREMENT_WORKER_URL` in the Style Backend environment to the deployed body-measurement worker base URL. The worker must implement:
`POST /body-measurements/process` (multipart `front`, `side`, optional `back`, `left`, `right`, `height`, `unit`, `scan_id`; internal header `x-fabric-internal-secret`).

Expected JSON:
```json
{
  "status": "review",
  "engine_version": "your-model-version",
  "measurements": {
    "bust": {"value": 92.4, "confidence": 0.82}
  },
  "confidence": {"overall": 0.82},
  "outputs": {"mesh_url": null, "measurement_report_url": null}
}
```
Values above are schema examples only, not actual measurements. The backend rejects responses without a measurements object.

**Important implementation boundary:** the uploaded `worker-fabricnow.zip` contains the garment-pattern generation pipeline; it does not contain the calibrated 3D body reconstruction and body measurement engine described in the attached plan. I have integrated the workspace UI, authenticated API boundary, persistence and existing image-credit accounting, but have not fabricated a measurement engine or presented vision guesses as tape-accurate dimensions. Until the dedicated worker is implemented and deployed, the page will show a clear engine-not-connected message (HTTP 503) and will not consume credits. The 3D viewer, calibrated mesh fitting, verified circumferences and pattern drafting from measured body profiles therefore remain engine-dependent.
