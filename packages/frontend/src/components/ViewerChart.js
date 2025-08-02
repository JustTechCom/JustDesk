import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { count, events } = payload[0].payload;
    return (
      <div className="bg-gray-800 p-2 rounded text-white text-sm">
        <p className="font-semibold">{label}</p>
        <p>{count} viewers</p>
        {events && events.length > 0 && (
          <div className="mt-1">
            {events.map((e, i) => (
              <div
                key={i}
              >{`${e.nickname || 'Anon'} ${e.action === 'join' ? 'joined' : 'left'}`}</div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ViewerChart({ data }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 h-64">
      <h3 className="text-lg font-semibold text-white mb-4">Viewer Analytics (last 60 min)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis dataKey="time" stroke="#fff" />
          <YAxis allowDecimals={false} stroke="#fff" />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
