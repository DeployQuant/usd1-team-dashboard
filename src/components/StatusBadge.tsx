"use client";

const statusColors: Record<string, string> = {
  "OPEN": "bg-gray-100 text-gray-700 border-gray-200",
  "IN PROGRESS": "bg-blue-50 text-blue-700 border-blue-200",
  "IN FLIGHT": "bg-blue-50 text-blue-700 border-blue-200",
  "PLANNED": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "REVIEW": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "AUDIT-GATED": "bg-orange-50 text-orange-700 border-orange-200",
  "COMPLETED": "bg-green-50 text-green-700 border-green-200",
  "DONE": "bg-green-50 text-green-700 border-green-200",
  "BLOCKED": "bg-red-50 text-red-700 border-red-200",
  "PENDING AUDIT": "bg-orange-50 text-orange-700 border-orange-200",
};

export default function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || statusColors["OPEN"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status}
    </span>
  );
}
