import { MainLayout } from "@/components/MainLayout";
import { ChatView } from "@/components/ChatView";
import { LearnView } from "@/components/LearnView";
import { useApp } from "@/contexts/AppContext";

const Index = () => {
  const { mode } = useApp();

  return (
    <MainLayout title={mode === "chat" ? "Chat" : "Learn"}>
      <div className="h-full transition-opacity duration-300" key={mode}>
        {mode === "chat" ? <ChatView /> : <LearnView />}
      </div>
    </MainLayout>
  );
};

export default Index;
