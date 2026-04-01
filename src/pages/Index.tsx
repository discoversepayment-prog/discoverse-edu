import { MainLayout } from "@/components/MainLayout";
import { LearnView } from "@/components/LearnView";

const Index = () => {
  return (
    <MainLayout title="Learn">
      <div className="h-full">
        <LearnView />
      </div>
    </MainLayout>
  );
};

export default Index;
