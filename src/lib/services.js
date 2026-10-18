import Service from "../models/Service.js";

/** Layanan aktif dalam bentuk polos (aman dikirim ke Client Component). */
export async function listActiveServices() {
  const services = await Service.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .select("name slug description output requirements steps")
    .lean();
  return services.map(({ _id, ...s }) => ({
    id: String(_id),
    name: s.name,
    slug: s.slug,
    description: s.description,
    output: s.output,
    requirements: s.requirements,
    steps: s.steps.map(({ key, name, role, slaDays }) => ({ key, name, role, slaDays })),
    totalSlaDays: s.steps.reduce((sum, step) => sum + (step.slaDays || 0), 0),
  }));
}
