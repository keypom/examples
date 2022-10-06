import { useState } from 'react'

const genFields = ({data, values, minMax, onValueChange}) => {
	return Object.entries(data).map(([k, v]) => {
		if (/__/.test(k)) return null

		

		const input = {
			id: k,
			type: 'text',
			className: 'u-full-width',
			required: v !== '_',
			value: values[k],
			onChange: (e) => {
				onValueChange(k, e.target[/true|false/.test(v) ? 'checked' : 'value'])
			}
		}
		if (typeof v === 'number') {
			input.type = 'number'
			if (minMax[k]) {
				Object.entries(minMax[k]).forEach(([k, v]) => input[k] = v)
			}
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

export const Form = ({ data, onChange, submit, submitLabel, minMax }) => {

	const [values, setValues] = useState({ ...data })
	const onValueChange = (k, v) => {
		const newValues = { ...values, [k]: v }
		setValues(newValues)
		if (onChange) onChange(k, newValues)
	}

	return <>
		<div className="row">
			{genFields({data, values, minMax, onValueChange})}
		</div>
		{ submit && <button className="outline button-primary" onClick={() => {

			/// validation
			let error = null
			Object.entries(values).forEach(([k, v]) => {
				if (!minMax[k]) return
				if (values[k] > minMax[k].max) {
					error = `Exceeded max value: ${minMax[k].max} for ${k}`
					onValueChange(k, minMax[k].max)
				}
				if (values[k] < minMax[k].min) {
					error = `Exceeded min value: ${minMax[k].min} for ${k}`
					onValueChange(k, minMax[k].min)
				}
			})
			if (error) return alert(error)

			submit(values)
		}}>{ submitLabel ? submitLabel : 'Submit' }</button> }
	</>
}