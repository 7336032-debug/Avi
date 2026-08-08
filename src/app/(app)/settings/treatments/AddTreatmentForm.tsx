"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Checkbox, Textarea } from "@/components/ui/Field";
import { createTreatment } from "./actions";

export function AddTreatmentForm({
  categories,
  onSaved,
}: {
  categories: string[];
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSeries, setIsSeries] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus size={18} />
        הוספת טיפול
      </Button>
    );
  }

  return (
    <Card>
      <form
        ref={formRef}
        action={async (formData) => {
          await createTreatment(formData);
          formRef.current?.reset();
          setOpen(false);
          onSaved?.();
        }}
        className="space-y-3"
      >
        <div>
          <Label htmlFor="new-category">קטגוריה</Label>
          <Input
            id="new-category"
            name="category"
            list="categories-list"
            defaultValue={categories[0] ?? "טיפולי פנים"}
            required
          />
          <datalist id="categories-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="new-name">שם הטיפול</Label>
          <Input id="new-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="new-description">
            תיאור מורחב (אופציונלי — לא מוצג בכרטיסיות הבחירה)
          </Label>
          <Textarea id="new-description" name="description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="new-price">מחיר (₪)</Label>
            <Input id="new-price" name="price" type="number" min="0" />
          </div>
          <div>
            <Label htmlFor="new-duration">משך (דקות)</Label>
            <Input id="new-duration" name="duration_minutes" type="number" min="0" />
          </div>
        </div>
        <div>
          <Label htmlFor="new-price-note">הערת מחיר (אופציונלי)</Label>
          <Input id="new-price-note" name="price_note" />
        </div>
        <Checkbox
          name="is_series"
          label="קיימת אופציית סדרה"
          checked={isSeries}
          onChange={(e) => setIsSeries(e.target.checked)}
        />
        {isSeries ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-series-size">גודל סדרה</Label>
              <Input id="new-series-size" name="series_size" type="number" min="1" />
            </div>
            <div>
              <Label htmlFor="new-series-price">מחיר סדרה (₪)</Label>
              <Input id="new-series-price" name="series_price" type="number" min="0" />
            </div>
          </div>
        ) : null}
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm">
            הוספה
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
          >
            ביטול
          </Button>
        </div>
      </form>
    </Card>
  );
}
