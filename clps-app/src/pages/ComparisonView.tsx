import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { Loader2 } from 'lucide-react';

export default function ComparisonView() {
  const navigate = useNavigate();
  const { SITES } = useMission();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      const results = [];
      for (const site of SITES) {
        try {
          const res = await fetch(`/${site.id}_data.json`);
          const json = await res.json();
          const data = json.data || json; // Handle both formats

          // Math Logic
          const sunHours = data.filter((d: any) => d.sunElevation > 0).length;
          const commsHours = data.filter((d: any) => d.commsStatus !== 'BLACKOUT').length;
          const totalHours = data.length;
          
          const avgSolar = data.reduce((acc: number, d: any) => acc + (d.solarIrradiance || 0), 0) / totalHours;

          results.push({
            ...site,
            sunHours,
            commsUptime: ((commsHours / totalHours) * 100).toFixed(1),
            avgSolar: avgSolar.toFixed(1)
          });
        } catch (err) {
          console.error(`Failed to load data for ${site.name}`, err);
        }
      }
      
      // Sort by best Comms Uptime
      results.sort((a, b) => parseFloat(b.commsUptime) - parseFloat(a.commsUptime));
      setScores(results);
      setLoading(false);
    }
    loadAllData();
  }, [SITES]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
              ← RETURN TO ORBIT
            </button>
            <h1 className="text-xl font-bold tracking-widest text-blue-400">MISSION PLANNER: SITE COMPARISON</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-blue-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>CALCULATING 30-DAY TELEMETRY...</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs">
                  <th className="p-5 font-normal">RANK</th>
                  <th className="p-5 font-normal">SITE NAME</th>
                  <th className="p-5 font-normal">SUN HOURS</th>
                  <th className="p-5 font-normal">COMMS UPTIME</th>
                  <th className="p-5 font-normal">AVG SOLAR</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, index) => (
                  <tr 
                    key={s.id} 
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/mission/${s.id}`)}
                  >
                    <td className="p-5 text-gray-500">#{index + 1}</td>
                    <td className="p-5 font-bold text-blue-100 group-hover:text-blue-400 transition-colors">{s.name}</td>
                    <td className="p-5 text-yellow-400">{s.sunHours} h</td>
                    <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-xs ${parseFloat(s.commsUptime) > 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {s.commsUptime}%
                        </span>
                    </td>
                    <td className="p-5 text-blue-400">{s.avgSolar} W/m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}