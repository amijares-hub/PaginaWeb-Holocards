import { useState } from "react";
import HeaderV2 from "../layout/HeaderV2";
import { InteractiveHero } from "../ui/InteractiveHero";
import AnnouncementBar from "../layout/AnnouncementBar";

export default function HomePageContent() {
  const [showFranchise, setShowFranchise] = useState(false);

  const navigateToHome = () => {
    setShowFranchise(false);
  };

  const navigateToFranchise = () => {
    setShowFranchise(true);
  };

  return (
    <div className="min-h-screen sm:h-screen sm:max-h-screen w-full overflow-x-hidden sm:overflow-hidden flex flex-col justify-between bg-[#09090b] text-white font-sans">
      <div className="shrink-0">
        <AnnouncementBar />
        <HeaderV2 onHomeClick={navigateToHome} onFranchiseClick={navigateToFranchise} />
      </div>
      
      <main className="flex-1 flex flex-col justify-center relative py-1 overflow-x-hidden">
        <InteractiveHero 
          isHomePage={!showFranchise} 
          onFranchiseTabClick={() => setShowFranchise(true)}
        />
      </main>
    </div>
  );
}