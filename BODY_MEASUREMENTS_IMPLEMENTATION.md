# AI Body Measurements — integrated FabricNow workspace

The existing sidebar route `AI Body Measurements` now provides photo capture, a measurement result profile, recent scans, a rotatable GLB viewer, manual measurement correction, CSV export, pattern drafting controls and SVG export.

The page uses the existing authenticated `api()` client, selected-company header, toast notifications and API Growth subscription gate. It does not create a separate user or billing system.

Successful scan processing deducts the number of uploaded source images from the existing API Growth image usage. Successful pattern generation deducts one image-equivalent usage unit. Failed or rejected processing does not deduct usage. The Style Backend remains the authority for entitlement and usage accounting.

See `fabricnow_worker/BODY_MEASUREMENT_ENGINE.md` for the reconstruction method, endpoints and accuracy limitations. Production deployment requires the worker URL and matching internal secret in the Style Backend and a persistent worker data volume.
