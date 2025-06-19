<?php

namespace YahnisElsts\AdminMenuEditor\Customizable\Schemas;

use YahnisElsts\AdminMenuEditor\ProCustomizable\Settings\WithSchema\CssPropertySetting;
use YahnisElsts\AdminMenuEditor\ProCustomizable\Settings\WithSchema\Font;

class SchemaFactory {
	public function string($label = null) {
		return new StringSchema($label);
	}

	public function boolean($label = null) {
		return new Boolean($label);
	}

	public function number($label = null) {
		return new Number($label);
	}

	public function int($label = null) {
		return (new Number($label))->int();
	}

	public function enum(array $values, $label = null) {
		return (new Enum($label))->values($values);
	}

	public function struct(array $fieldSchemas, $label = null) {
		return new Struct($fieldSchemas, $label);
	}

	public function record(Schema $keySchema, Schema $itemSchema, $label = null) {
		return new Record($keySchema, $itemSchema, $label);
	}

	/**
	 * Indexed array schema.
	 *
	 * "array" is a reserved keyword in PHP, so we can't use it as a method name.
	 *
	 * @param Schema $itemSchema
	 * @param string|null $label
	 * @return IndexedArray
	 */
	public function arr(Schema $itemSchema, $label = null) {
		return new IndexedArray($itemSchema, $label);
	}

	public function cssColor($label = null) {
		return (new Color($label))->orTransparent()->settingClassHint(CssPropertySetting::class);
	}

	public function cssFont($label = null) {
		return (new PlaceholderStruct($label))->settingClassHint(Font::class);
	}
}