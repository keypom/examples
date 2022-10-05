import { useState } from 'react'

const genFields = (data, values, onChange) => {
	return Object.entries(data).map(([k, v]) => {
		if (/__/.test(k)) return null

		const input = {
			id: k,
			type: 'text',
			className: 'u-full-width',
			required: v !== '_',
			value: values[k],
			onChange: (e) => {
				onChange(k, e.target[/true|false/.test(v) ? 'checked' : 'value'])
			}
		}
		if (typeof v === 'number') {
			input.type = 'number'
			input.min = 0.1
			input.step = 0.1
		} else if (typeof v === 'boolean') {
			input.type = 'checkbox'
			input.checked = values[k]
		}
		
		return <div key={k}>
			<label htmlFor={k}>{k}</label>
			{
				v.toString().length > 64 ? 
				<textarea {...input} />
				:
				<input {...input} />
			}
		</div>
	})
}

export const Form = ({ data, onChange, submit, submitLabel }) => {

	const [values, setValues] = useState({ ...data })
	const onValueChange = (k, v) => {
		const newValues = { ...values, [k]: v }
		setValues(newValues)
		if (onChange) onChange(k, newValues)
	}

	return <>
		<div className="row">
			{genFields(data, values, onValueChange)}
		</div>
		{ submit && <button className="outline button-primary" onClick={() => submit(values)}>{ submitLabel ? submitLabel : 'Submit' }</button> }
	</>
}