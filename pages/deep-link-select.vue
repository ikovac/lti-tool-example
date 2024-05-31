<script setup>
const { query } = useRoute();
import $ from "jquery";

if (!query.lti) {
  console.error("Missing LTI token query parameter");
}

const options = [
  {
    value: 1,
    label: "Resource 1",
  },
  {
    value: 2,
    label: "Resource 2",
  },
];

const selected = ref(1);

const submit = async () => {
  const form = await $fetch("/deep-link-resource", {
    method: "POST",
    body: { resourceId: selected.value },
    headers: {
      Authorization: `Bearer ${query.lti}`,
    },
    parseResponse: (txt) => txt,
  });
  $("body").append(form);
};
</script>

<template>
  <div class="p-4">
    <h1 class="mb-4">Deep linking</h1>
    <URadioGroup
      v-model="selected"
      legend="Choose resource"
      :options="options"
      class="mb-4"
    />
    <UButton @click="submit">Submit</UButton>
  </div>
</template>
