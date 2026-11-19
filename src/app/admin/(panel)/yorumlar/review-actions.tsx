"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { moderateReviewAction } from "../../actions";

export function ReviewActions({ id, status }: { id: number; status: "pending" | "approved" | "rejected" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (to: "approved" | "rejected") =>
    start(async () => {
      const r = await moderateReviewAction(id, to);
      toast(r.message ?? "", r.ok ? "success" : "error");
      router.refresh();
    });
  return (
    <div className="flex shrink-0 gap-2">
      {status !== "approved" && (
        <Button size="sm" disabled={pending} onClick={() => act("approved")}>
          Onayla
        </Button>
      )}
      {status !== "rejected" && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => act("rejected")}>
          Reddet
        </Button>
      )}
    </div>
  );
}
