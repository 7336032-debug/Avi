"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Checkbox, Textarea } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";
import { getTreatmentEmoji } from "@/lib/categoryStyle";
import { updateTreatment, deleteTreatment } from "./actions";
import type { Treatment } from "@/types/database";

export function TreatmentRow({
  treatment,
  onSaved,
}: {
  treatment: Treatment;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isSeries, setIsSeries] = useState(treatment.is_series);
  const updateAction = async (formData: FormData) => {
    await updateTreatment(treatment.id, formData);
    onSaved?.();
  };
  const deleteAction = async () => {
    await deleteTreatment(treatment.id);
    onSaved?.();
  };

  if (!editing) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">
            <span aria-hidden>{getTreatmentEmoji(treatment.name, treatment.category)}</span>{" "}
            {treatment.name}
          </p>
          <p className="text-sm font-semibold text-accent-strong">
            {treatment.price != null
              ? formatCurrency(treatment.price)
              : (treatment.price_note ?? "מחיר לעריכה")}
            {treatment.duration_minutes != null
              ? ` · ${treatment.duration_minutes} דק'`
              : " · משך לעריכה"}
            {treatment.is_series ? ` · סדרת ${treatment.series_size}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full p-2 text-text-muted hover:bg-surface-soft"
          aria-label="עריכה"
        >
          <Pencil size={18} />
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="category" value={treatment.category} />
        <div>
          <Label htmlFor={`name-${treatment.id}`}>שם הטיפול</Label>
          <Input id={`name-${treatment.id}`} name="name" defaultValue={treatment.name} required />
        </div>
        <div>
          <Label htmlFor={`description-${treatment.id}`}>
            תיאור מורחב (אופציונלי — לא מוצג בכרטיסיות הבחירה)
          </Label>
          <Textarea
            id={`description-${treatment.id}`}
            name="description"
            defaultValue={treatment.description ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`price-${treatment.id}`}>מחיר (₪)</Label>
            <Input
              id={`price-${treatment.id}`}
              name="price"
              type="number"
              min="0"
              defaultValue={treatment.price ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`duration-${treatment.id}`}>משך (דקות)</Label>
            <Input
              id={`duration-${treatment.id}`}
              name="duration_minutes"
              type="number"
              min="0"
              defaultValue={treatment.duration_minutes ?? ""}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`price_note-${treatment.id}`}>הערת מחיר (טווח/טקסט חופשי)</Label>
          <Input
            id={`price_note-${treatment.id}`}
            name="price_note"
            defaultValue={treatment.price_note ?? ""}
            placeholder='למשל "700-900 ₪" או "לפי הערכה בייעוץ"'
          />
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
              <Label htmlFor={`series_size-${treatment.id}`}>גודל סדרה</Label>
              <Input
                id={`series_size-${treatment.id}`}
                name="series_size"
                type="number"
                min="1"
                defaultValue={treatment.series_size ?? ""}
              />
            </div>
            <div>
              <Label htmlFor={`series_price-${treatment.id}`}>מחיר סדרה (₪)</Label>
              <Input
                id={`series_price-${treatment.id}`}
                name="series_price"
                type="number"
                min="0"
                defaultValue={treatment.series_price ?? ""}
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" onClick={() => setEditing(false)}>
            שמירה
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing(false)}
          >
            ביטול
          </Button>
        </div>
      </form>
      <form action={deleteAction} className="mt-2">
        <Button type="submit" variant="ghost" size="sm" className="text-warning">
          <Trash2 size={16} />
          מחיקת טיפול
        </Button>
      </form>
    </Card>
  );
}
