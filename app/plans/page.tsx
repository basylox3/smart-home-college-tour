import type { Metadata } from "next";
import { PlansPage } from "../../components/PlansPage";

export const metadata: Metadata = {
  title: "Планы колледжа | Перспективный колледж",
  description: "Генплан территории и краткая поэтажная схема Перспективного колледжа в отдельной вкладке.",
  alternates: {
    canonical: "/plans",
  },
};

export default function PlansRoute() {
  return <PlansPage />;
}
