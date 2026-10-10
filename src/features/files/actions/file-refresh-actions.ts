"use server";

import { revalidatePath } from "next/cache";

export async function refreshFilePages() {
  revalidatePath("/schedule");
  revalidatePath("/progress");
}
