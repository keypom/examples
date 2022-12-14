
import './Modal.scss';

export const Modal = ({
	state, update
}) => {

	const {
		dialog
	} = state

	if (!dialog) return null

	return <div className="modal">
		<div>
			<div className='dialog'>
				{dialog}
			</div>
		</div>
	</div>
}