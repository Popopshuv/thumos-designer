import ClientOnlyThreeScene from "@/components/ThreeScene/ClientOnly";

export default function Home() {
  return (
    <div className="fixed inset-0 w-screen h-screen">
      <ClientOnlyThreeScene />
    </div>
  );
}
