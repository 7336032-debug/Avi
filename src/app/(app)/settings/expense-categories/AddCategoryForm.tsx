"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { createExpenseCategory } from "./actions";

export function AddCategoryForm({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <Plus size={18} />
        הוספת קטגוריה
      </Button>
    );
  }

  return (
    <Card>
      <form
        ref={formRef}
        action={async (formData) => {
          await createExpenseCategory(formData);
          formRef.current?.reset();
          setOpen(false);
          onSaved?.();
        }}
        className="space-y-3"
      >
        <div>
          <Label htmlFor="new-cat-name">שם קטגוריה</Label>
          <Input id="new-cat-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="new-cat-amount">סכום מוצע (₪, אופציונלי)</Label>
          <Input id="new-cat-amount" name="default_amount" type="number" min="0" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            הוספה
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            ביטול
          </Button>
        </div>
      </form>
    </Card>
  );
}
