import Hero from "../components/dashboard/Hero";
import QuickAccess from "../components/dashboard/QuickAccess";
import TodaySchedule from "../components/dashboard/TodaySchedule";
import StudentProfileCard from "../components/dashboard/StudentProfileCard";
import MotivationalCard from "../components/dashboard/MotivationalCard";

export default function Dashboard() {
  return (
    <div className="space-y-7">
      <Hero />
      <QuickAccess />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <TodaySchedule />
        </div>

        <div className="space-y-6 xl:col-span-5">
          <StudentProfileCard />
          <MotivationalCard />
        </div>
      </div>
    </div>
  );
}
