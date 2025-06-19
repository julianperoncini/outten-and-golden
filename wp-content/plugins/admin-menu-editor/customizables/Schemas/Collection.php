<?php

namespace YahnisElsts\AdminMenuEditor\Customizable\Schemas;

abstract class Collection extends Schema {
	/**
	 * @var Schema
	 */
	protected $keySchema;

	/**
	 * @var Schema
	 */
	protected $itemSchema;

	public function __construct(Schema $itemSchema, Schema $keySchema = null, $label = null) {
		parent::__construct($label);
		$this->itemSchema = $itemSchema;
		if ( $keySchema === null ) {
			$this->keySchema = (new Anything());
		} else {
			$this->keySchema = $keySchema;
		}
	}

	public function parse($value, $errors = null, $stopOnFirstError = false) {
		$value = $this->checkForNull($value, $errors);
		if ( ($value === null) || is_wp_error($value) ) {
			return $value;
		}

		if ( !is_array($value) ) {
			return self::addError($errors, 'collection_value_invalid', 'Collection value must be an array');
		}

		$parsedValues = [];
		$foundErrors = false;
		foreach ($value as $key => $item) {
			$parsedItem = $this->itemSchema->parse($item, $errors, $stopOnFirstError);
			if ( is_wp_error($parsedItem) ) {
				$errors = $parsedItem;
				$foundErrors = true;
				if ( $stopOnFirstError ) {
					break;
				}
			} else {
				$parsedKey = $this->keySchema->parse($key, $errors, $stopOnFirstError);
				if ( is_wp_error($parsedKey) ) {
					$errors = $parsedKey;
					$foundErrors = true;
					if ( $stopOnFirstError ) {
						break;
					}
				} else {
					$parsedValues[$parsedKey] = $parsedItem;
				}
			}
		}

		if ( $foundErrors ) {
			return $errors;
		} else {
			return $parsedValues;
		}
	}
}