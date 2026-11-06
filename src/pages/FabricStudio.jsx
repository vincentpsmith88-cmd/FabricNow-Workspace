import React from 'react';
import { ExternalLink, Scissors } from 'lucide-react';
import './fabric-studio.css';

const STUDIO_URL = 'https://studios.fabricnow.pro';

export default function FabricStudio() {
  return (
    <section className="fabric-studio-page">
      <header className="fabric-studio-toolbar">
        <div className="fabric-studio-heading">
          <span className="fabric-studio-icon"><Scissors size={18} /></span>
          <div>
            <h2>FabricNow Studio</h2>
            <p>Draft, fit and visualize patterns in 2D and 3D.</p>
          </div>
        </div>
        <a className="btn btn-ghost" href={STUDIO_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open in new tab
        </a>
      </header>
      <iframe
        className="fabric-studio-frame"
        title="FabricNow 2D and 3D pattern-design studio"
        src={STUDIO_URL}
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </section>
  );
}
