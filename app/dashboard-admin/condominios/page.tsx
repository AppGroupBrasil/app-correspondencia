"use client";
import GerenciarCondominios from "@/components/GerenciarCondominios";
import withAuth from "@/components/withAuth";

function CondominiosPage() {
  return (
    <div className="container mx-auto p-6">
      <GerenciarCondominios />
    </div>
  );
}

export default withAuth(CondominiosPage, ["adminMaster"]);
