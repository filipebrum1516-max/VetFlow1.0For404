import { useCallback, useState } from "react"
import { normalize, useVetFlow, type Item, type UnitData } from "../store"
import FormDrawer, { type Values } from "./FormDrawer"
import { formFor } from "./forms"
import { useQueryFlag, useToast } from "./ui"

export function prefillFromParams(params: URLSearchParams, data: UnitData): Values {
  const prefill: Values = {}
  const animal = params.get("animal")
  if (animal) {
    const match =
      data.animais.find((item) => item.id === animal) ||
      data.animais.find((item) => normalize(item.name) === normalize(animal))
    if (match) prefill.animalId = match.id
  }
  const pro = params.get("pro")
  if (pro) {
    const match =
      data.profissionais.find((item) => item.id === pro) ||
      data.profissionais.find((item) => normalize(item.name) === normalize(pro))
    if (match) prefill.professionalId = match.id
  }
  params.forEach((value, key) => {
    if (!["novo", "animal", "pro", "form"].includes(key)) prefill[key] = value
  })
  return prefill
}

type DrawerState = { key: string; item?: Item; prefill?: Values } | null

/** Gaveta de cadastro + toast + abertura automática por ?novo=1 */
export function usePageForms(defaultKey: string, onSaved?: (item: Item, isNew: boolean) => void) {
  const { data } = useVetFlow()
  const [state, setState] = useState<DrawerState>(null)
  const [toast, showToast] = useToast()
  const open = useCallback(
    (key: string = defaultKey, item?: Item, prefill?: Values) => setState({ key, item, prefill }),
    [defaultKey],
  )
  useQueryFlag(
    useCallback(
      (params: URLSearchParams) =>
        setState({ key: params.get("form") || defaultKey, prefill: prefillFromParams(params, data) }),
      [data, defaultKey],
    ),
  )
  const def = state ? formFor(state.key) : undefined
  const node = (
    <>
      {state && def && (
        <FormDrawer
          key={`${state.key}-${state.item?.id || "novo"}`}
          def={def}
          item={state.item}
          prefill={state.prefill}
          onClose={() => setState(null)}
          onSaved={(saved, isNew) => {
            showToast(isNew ? `Cadastro salvo: ${saved.name}.` : `Alterações salvas: ${saved.name}.`)
            onSaved?.(saved, isNew)
          }}
        />
      )}
      {toast}
    </>
  )
  return { open, node, toast: showToast }
}
