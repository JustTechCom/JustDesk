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
    const { count, events, viewers } = payload[0].payload;
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
        {viewers && viewers.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold">Currently present</div>
            {viewers.map((v, i) => (
              <div key={i}>{v || 'Anon'}</div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ViewerChart({ data = [] }) {
  const chartData =
    data.length > 0 && data[0].count === 0
      ? data
      : [{ time: data[0]?.time ?? '', count: 0, events: [], viewers: [] }, ...data];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 h-64">
      <h3 className="text-lg font-semibold text-white mb-4">Viewer Analytics (first hour)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis dataKey="time" stroke="#fff" />
          <YAxis allowDecimals={false} stroke="#fff" />
          <Tooltip content={<CustomTooltip />} />
          <Line type="stepAfter" dataKey="count" stroke="#3b82f6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
