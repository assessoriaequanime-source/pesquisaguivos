import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

const UF_BY_LABEL: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA",
  "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO",
  "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO",
  "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP",
  "Sergipe": "SE", "Tocantins": "TO",
};

type City = { id: number; nome: string };
type Poly = number[][][]; // rings of [lon,lat]
type Feature = { id: number; nome: string; polygons: Poly[] };

type Props = {
  stateLabel: string | undefined;
  value: string; // city name
  onChange: (city: string) => void;
  required?: boolean;
  invalid?: boolean;
};

// Cache in-memory across renders/questions
const cache = new Map<string, { cities: City[]; features: Feature[]; bbox: [number, number, number, number] }>();

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function extractPolygons(geom: any): Poly[] {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

export function StateCityPicker({ stateLabel, value, onChange, required = false, invalid = false }: Props) {
  const uf = stateLabel ? UF_BY_LABEL[stateLabel] : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ cities: City[]; features: Feature[]; bbox: [number, number, number, number] } | null>(null);
  const [query, setQuery] = useState("");
  const [hoverName, setHoverName] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery("");
    setData(null);
    setError(null);
    if (!uf) return;
    if (cache.has(uf)) { setData(cache.get(uf)!); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [citiesRes, geoRes] = await Promise.all([
          fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`),
          fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima`),
        ]);
        if (!citiesRes.ok || !geoRes.ok) throw new Error("net");
        const cities: City[] = (await citiesRes.json()).map((c: any) => ({ id: c.id, nome: c.nome }));
        const geo = await geoRes.json();
        const byId = new Map(cities.map((c) => [c.id, c.nome] as const));
        const features: Feature[] = (geo.features || []).map((f: any) => {
          const id = Number(f.properties?.codarea ?? f.id);
          return { id, nome: byId.get(id) || String(id), polygons: extractPolygons(f.geometry) };
        }).filter((f: Feature) => f.polygons.length > 0);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const f of features) for (const poly of f.polygons) for (const ring of poly) for (const [x, y] of ring) {
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
        const bbox: [number, number, number, number] = [minX, minY, maxX, maxY];
        const payload = { cities, features, bbox };
        cache.set(uf, payload);
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError("Não foi possível carregar o mapa. Você ainda pode digitar sua cidade abaixo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uf]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = norm(query);
    if (!q) return data.cities.slice(0, 200);
    return data.cities.filter((c) => norm(c.nome).includes(q)).slice(0, 200);
  }, [data, query]);

  const project = useMemo(() => {
    if (!data) return null;
    const [minX, minY, maxX, maxY] = data.bbox;
    const W = 800, H = 520, pad = 12;
    const dx = maxX - minX || 1, dy = maxY - minY || 1;
    const scale = Math.min((W - pad * 2) / dx, (H - pad * 2) / dy);
    const ox = (W - dx * scale) / 2 - minX * scale;
    const oy = (H - dy * scale) / 2 + maxY * scale;
    return {
      W, H,
      to: (x: number, y: number) => [x * scale + ox, oy - y * scale] as [number, number],
    };
  }, [data]);

  const paths = useMemo(() => {
    if (!data || !project) return [] as { d: string; nome: string; id: number }[];
    return data.features.map((f) => {
      const d = f.polygons.map((poly) =>
        poly.map((ring) => {
          const pts = ring.map(([x, y]) => project.to(x, y));
          return "M" + pts.map(([X, Y]) => `${X.toFixed(1)},${Y.toFixed(1)}`).join("L") + "Z";
        }).join(" ")
      ).join(" ");
      return { d, nome: f.nome, id: f.id };
    });
  }, [data, project]);

  const foreign = !uf;

  // Close dropdown on outside click
  useEffect(() => {
    if (!focused) return;
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [focused]);

  if (foreign) return null;

  return (
    <div className="anim-fade-up mt-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Selecione sua cidade — clique no mapa ou busque na lista.
          {required ? " (obrigatório)" : ""}
        </label>
        {value && (
          <button
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-grape"
          >
            <X className="h-3 w-3" strokeWidth={2} /> Limpar
          </button>
        )}
      </div>

      {/* MAP */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/30">
        {loading && (
          <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground sm:h-[300px]">
            Carregando mapa de {stateLabel}…
          </div>
        )}
        {error && !loading && (
          <div className="flex h-[120px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {error}
          </div>
        )}
        {data && project && !loading && (
          <svg
            viewBox={`0 0 ${project.W} ${project.H}`}
            className="block h-[240px] w-full sm:h-[340px]"
            role="img"
            aria-label={`Mapa de ${stateLabel} com municípios`}
          >
            <g>
              {paths.map((p) => {
                const isSel = p.nome === value;
                const isHov = p.nome === hoverName;
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    onMouseEnter={() => setHoverName(p.nome)}
                    onMouseLeave={() => setHoverName((n) => (n === p.nome ? null : n))}
                    onClick={() => onChange(p.nome)}
                    className="cursor-pointer transition-colors"
                    fill={isSel ? "var(--grape)" : isHov ? "var(--grape-soft)" : "#e7e5ea"}
                    stroke={isSel ? "var(--grape)" : "#ffffff"}
                    strokeWidth={isSel ? 1.2 : 0.6}
                    style={{ filter: isSel ? "drop-shadow(0 4px 10px rgba(112,60,190,0.35))" : undefined }}
                  >
                    <title>{p.nome}</title>
                  </path>
                );
              })}
            </g>
          </svg>
        )}

        {(hoverName || value) && data && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-border bg-white/95 px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-grape" strokeWidth={2} />
              {hoverName || value}
            </span>
          </div>
        )}
      </div>

      {/* SEARCH + LIST */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={focused ? query : value || query}
            onChange={(e) => { setQuery(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            placeholder={data ? "Buscar cidade…" : "Aguarde o carregamento…"}
            required={required}
            aria-invalid={invalid}
            className={[
              "w-full rounded-xl border-2 bg-card py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-4",
              invalid
                ? "border-red-400 focus:border-red-500 focus:ring-red-200/70"
                : "border-border focus:border-grape focus:ring-grape/15",
            ].join(" ")}
          />
        </div>

        {focused && data && filtered.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">
            {filtered.map((c) => {
              const sel = c.nome === value;
              return (
                <button
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onChange(c.nome); setFocused(false); setQuery(""); }}
                  className={[
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    sel ? "bg-grape text-white" : "hover:bg-secondary",
                  ].join(" ")}
                >
                  <MapPin className={`h-3.5 w-3.5 ${sel ? "text-white" : "text-muted-foreground"}`} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
