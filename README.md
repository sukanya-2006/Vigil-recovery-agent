<svg width="760" height="480" viewBox="0 0 760 480" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
  <rect width="760" height="480" fill="#F6F8FC"/>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="#5B6472" stroke-width="1.5"/>   
    </marker>
  </defs>
  <rect x="290" y="20" width="180" height="56" rx="10" fill="#FFFFFF" stroke="#3E5FF0" stroke-width="1.5"/>
  <text x="380" y="42" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Dashboard</text>
  <text x="380" y="60" text-anchor="middle" font-size="11" fill="#6B7590">React (Overview / Transactions / Audit)</text>
  <line x1="380" y1="76" x2="380" y2="106" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="290" y="110" width="180" height="56" rx="10" fill="#FFFFFF" stroke="#3E5FF0" stroke-width="1.5"/>
  <text x="380" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Express API</text>
  <text x="380" y="150" text-anchor="middle" font-size="11" fill="#6B7590">/api/summary, /transactions, /agent</text>
  <rect x="560" y="110" width="160" height="56" rx="10" fill="#FFFFFF" stroke="#6B7590" stroke-width="1.5"/>
  <text x="640" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">SQLite DB</text>
  <text x="640" y="150" text-anchor="middle" font-size="11" fill="#6B7590">Prisma ORM</text>
  <line x1="470" y1="138" x2="556" y2="138" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="380" y1="166" x2="380" y2="196" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="270" y="200" width="220" height="56" rx="10" fill="#FFFFFF" stroke="#3E5FF0" stroke-width="1.5"/>
  <text x="380" y="222" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Decision Engine</text>
  <text x="380" y="240" text-anchor="middle" font-size="11" fill="#6B7590">Rules + recovery score + cost-aware check</text>
  <line x1="330" y1="256" x2="245" y2="284" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="430" y1="256" x2="525" y2="284" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="140" y="290" width="200" height="56" rx="10" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.5"/>
  <text x="240" y="312" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Outcome Simulator</text>
  <text x="240" y="330" text-anchor="middle" font-size="11" fill="#6B7590">Executes RETRY / REMINDER / UPDATE</text>
  <rect x="420" y="290" width="220" height="56" rx="10" fill="#FFFFFF" stroke="#D97706" stroke-width="1.5"/>
  <text x="530" y="312" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Human Review Queue</text>
  <text x="530" y="330" text-anchor="middle" font-size="11" fill="#6B7590">Approve / reject uncertain cases</text>
  <line x1="270" y1="346" x2="345" y2="376" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="500" y1="346" x2="420" y2="376" stroke="#5B6472" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="290" y="380" width="180" height="56" rx="10" fill="#FFFFFF" stroke="#14213D" stroke-width="1.5"/>
  <text x="380" y="402" text-anchor="middle" font-size="14" font-weight="700" fill="#14213D">Audit Log</text>
  <text x="380" y="420" text-anchor="middle" font-size="11" fill="#6B7590">Every decision, reasoning, and result</text>
</svg>